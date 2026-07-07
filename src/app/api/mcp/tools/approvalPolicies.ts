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
    name: z.string().min(1, "ポリシー名は必須です"),
    triggerAction: z.enum(["inquiry.convert", "contract.create", "contract.cancel"]),
    templateId: z.string().uuid(),
    description: z.string().optional(),
    conditionField: z.string().optional(),
    conditionOperator: z.enum(CONDITION_OPERATORS).optional(),
    conditionValue: z.string().optional(),
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
    policyId: z.string().uuid(),
    name: z.string().min(1, "ポリシー名は必須です"),
    triggerAction: z.enum(["inquiry.convert", "contract.create", "contract.cancel"]),
    templateId: z.string().uuid(),
    description: z.string().optional(),
    conditionField: z.string().optional(),
    conditionOperator: z.enum(CONDITION_OPERATORS).optional(),
    conditionValue: z.string().optional(),
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
  policyId: z.string().uuid(),
});

const approvalPoliciesInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  updateSchema,
  toggleSchema,
]);

export function registerApprovalPoliciesTools(server: McpServer): void {
  server.registerTool(
    "approval_policies",
    {
      description:
        "承認ポリシーの一覧取得・作成・更新・有効/無効切替を行います。operation 引数で操作を切り替えます。",
      inputSchema: approvalPoliciesInputSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        switch (args.operation) {
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

            const hasCondition = args.conditionField && args.conditionField.trim() !== "";

            const result = await createPolicy({
              organizationId,
              actorId: userId,
              name: args.name,
              description: args.description ?? null,
              triggerAction: args.triggerAction,
              conditionField: hasCondition ? (args.conditionField ?? null) : null,
              conditionOperator: hasCondition
                ? ((args.conditionOperator as ConditionOperator) ?? null)
                : null,
              conditionValue: hasCondition ? (args.conditionValue ?? null) : null,
              templateId: args.templateId,
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

            const hasCondition = args.conditionField && args.conditionField.trim() !== "";

            const result = await updatePolicy({
              id: args.policyId,
              organizationId,
              actorId: userId,
              name: args.name,
              description: args.description ?? null,
              triggerAction: args.triggerAction,
              conditionField: hasCondition ? (args.conditionField ?? null) : null,
              conditionOperator: hasCondition
                ? ((args.conditionOperator as ConditionOperator) ?? null)
                : null,
              conditionValue: hasCondition ? (args.conditionValue ?? null) : null,
              templateId: args.templateId,
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
              id: args.policyId,
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
