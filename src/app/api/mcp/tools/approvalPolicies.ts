import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { createPolicy } from "@/application/usecases/createPolicy";
import { updatePolicy } from "@/application/usecases/updatePolicy";
import { togglePolicy } from "@/application/usecases/togglePolicy";
import * as approvalPolicyRepository from "@/infrastructure/repositories/approvalPolicyRepository";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";
import type { ConditionOperator } from "@/domain/models/approvalPolicy";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const CONDITION_OPERATORS = ["gt", "gte", "lt", "lte", "eq", "neq", "in"] as const;

const listSchema = z.object({
  operation: z.literal("list"),
});

const createSchema = z
  .object({
    operation: z.literal("create"),
    name: z.string().min(1, "ポリシー名は必須です").describe("ポリシー名"),
    triggerAction: z
      .enum(["inquiry.convert", "contract.create", "contract.cancel"])
      .describe("inquiry.convert=引合の案件化, contract.create=契約作成, contract.cancel=契約解約"),
    templateId: z.string().uuid().describe("適用する承認テンプレートID（UUID）"),
    description: z.string().optional(),
    conditionField: z.string().optional().describe("条件対象フィールド名"),
    conditionOperator: z
      .enum(CONDITION_OPERATORS)
      .optional()
      .describe("gt=より大きい, gte=以上, lt=未満, lte=以下, eq=等しい, neq=等しくない, in=含む"),
    conditionValue: z.string().optional().describe("条件値"),
  })
  .superRefine((data, ctx) => {
    const hasField = data.conditionField && data.conditionField.trim() !== "";
    if (hasField) {
      if (!data.conditionOperator) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conditionOperator"],
          message: "条件フィールドが設定されている場合、演算子は必須です",
        });
      }
      if (!data.conditionValue || data.conditionValue.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conditionValue"],
          message: "条件フィールドが設定されている場合、条件値は必須です",
        });
      }
    }
  });

const updateSchema = z
  .object({
    operation: z.literal("update"),
    policyId: z.string().uuid().describe("ポリシーID（UUID）"),
    name: z.string().min(1, "ポリシー名は必須です").describe("ポリシー名"),
    triggerAction: z
      .enum(["inquiry.convert", "contract.create", "contract.cancel"])
      .describe("inquiry.convert=引合の案件化, contract.create=契約作成, contract.cancel=契約解約"),
    templateId: z.string().uuid().describe("適用する承認テンプレートID（UUID）"),
    description: z.string().optional(),
    conditionField: z.string().optional().describe("条件対象フィールド名"),
    conditionOperator: z
      .enum(CONDITION_OPERATORS)
      .optional()
      .describe("gt=より大きい, gte=以上, lt=未満, lte=以下, eq=等しい, neq=等しくない, in=含む"),
    conditionValue: z.string().optional().describe("条件値"),
  })
  .superRefine((data, ctx) => {
    const hasField = data.conditionField && data.conditionField.trim() !== "";
    if (hasField) {
      if (!data.conditionOperator) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conditionOperator"],
          message: "条件フィールドが設定されている場合、演算子は必須です",
        });
      }
      if (!data.conditionValue || data.conditionValue.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["conditionValue"],
          message: "条件フィールドが設定されている場合、条件値は必須です",
        });
      }
    }
  });

const toggleSchema = z.object({
  operation: z.literal("toggle"),
  policyId: z.string().uuid().describe("ポリシーID（UUID）"),
});

const approvalPoliciesInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  updateSchema,
  toggleSchema,
]);

const approvalPoliciesAdvertisementSchema = buildAdvertisementSchema([
  listSchema,
  createSchema as unknown as z.ZodObject<z.ZodRawShape>,
  updateSchema as unknown as z.ZodObject<z.ZodRawShape>,
  toggleSchema,
]);

export function registerApprovalPoliciesTools(server: McpServer): void {
  server.registerTool(
    "approval_policies",
    {
      description:
        "承認ポリシー管理。承認ポリシー（ApprovalPolicy）・自動承認ルール・トリガーの一覧・作成・更新・有効/無効切替。トリガーアクション（inquiry.convert/contract.create/contract.cancel）と条件を管理する。operation: list/create/update/toggle",
      inputSchema: approvalPoliciesAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(approvalPoliciesInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof approvalPoliciesInputSchema>;

        switch (typedArgs.operation) {
          case "list": {
            if (!canPerform(role, "approvalSettings", "listPolicies")) {
              return toToolError("権限がありません");
            }
            const policies = await approvalPolicyRepository.findByOrganization(organizationId);
            return toToolSuccess(policies);
          }

          case "create": {
            if (!canPerform(role, "approvalSettings", "createPolicy")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createPolicy:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const hasCondition = typedArgs.conditionField && typedArgs.conditionField.trim() !== "";

            const result = await createPolicy({
              organizationId,
              actorId: userId,
              name: typedArgs.name,
              description: typedArgs.description ?? null,
              triggerAction: typedArgs.triggerAction,
              conditionField: hasCondition ? (typedArgs.conditionField ?? null) : null,
              conditionOperator: hasCondition
                ? ((typedArgs.conditionOperator as ConditionOperator) ?? null)
                : null,
              conditionValue: hasCondition ? (typedArgs.conditionValue ?? null) : null,
              templateId: typedArgs.templateId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.policy);
          }

          case "update": {
            if (!canPerform(role, "approvalSettings", "editPolicy")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updatePolicy:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const hasCondition = typedArgs.conditionField && typedArgs.conditionField.trim() !== "";

            const result = await updatePolicy({
              id: typedArgs.policyId,
              organizationId,
              actorId: userId,
              name: typedArgs.name,
              description: typedArgs.description ?? null,
              triggerAction: typedArgs.triggerAction,
              conditionField: hasCondition ? (typedArgs.conditionField ?? null) : null,
              conditionOperator: hasCondition
                ? ((typedArgs.conditionOperator as ConditionOperator) ?? null)
                : null,
              conditionValue: hasCondition ? (typedArgs.conditionValue ?? null) : null,
              templateId: typedArgs.templateId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.policy);
          }

          case "toggle": {
            if (!canPerform(role, "approvalSettings", "editPolicy")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:togglePolicy:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await togglePolicy({
              id: typedArgs.policyId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.policy);
          }

          default: {
            return toToolError("不明な operation です");
          }
        }
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
