import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { createTemplate } from "@/application/usecases/createTemplate";
import { updateTemplate } from "@/application/usecases/updateTemplate";
import { deleteTemplate } from "@/application/usecases/deleteTemplate";
import * as approvalTemplateRepository from "@/infrastructure/repositories/approvalTemplateRepository";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const templateFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "number", "date", "textarea", "select"]),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
});

const templateStepSchema = z.object({
  approverRole: z.enum(["admin", "member", "manager", "finance"]),
  deadlineHours: z.number().int().positive().optional(),
  condition: z
    .object({
      field: z.string(),
      operator: z.enum(["gt", "gte", "lt", "lte", "eq"]),
      value: z.number(),
    })
    .optional(),
});

const listSchema = z.object({
  operation: z.literal("list"),
});

const createSchema = z.object({
  operation: z.literal("create"),
  name: z.string().min(1, "テンプレート名は必須です"),
  steps: z.array(templateStepSchema).min(1),
  fields: z.array(templateFieldSchema).optional(),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  templateId: z.string().uuid(),
  name: z.string().min(1).optional(),
  steps: z.array(templateStepSchema).optional(),
  fields: z.array(templateFieldSchema).optional(),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  templateId: z.string().uuid(),
});

const approvalTemplatesInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  updateSchema,
  deleteSchema,
]);

const approvalTemplatesAdvertisementSchema = buildAdvertisementSchema([
  listSchema,
  createSchema,
  updateSchema,
  deleteSchema,
]);

export function registerApprovalTemplatesTools(server: McpServer): void {
  server.registerTool(
    "approval_templates",
    {
      description:
        "承認テンプレートの一覧取得・作成・更新・削除を行います。operation 引数で操作を切り替えます。",
      inputSchema: approvalTemplatesAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(approvalTemplatesInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof approvalTemplatesInputSchema>;

        switch (typedArgs.operation) {
          case "list": {
            if (!canPerform(role, "approvalSettings", "listTemplates")) {
              return toToolError("権限がありません");
            }
            const templates = await approvalTemplateRepository.findByOrganization(organizationId);
            return toToolSuccess(templates);
          }

          case "create": {
            if (!canPerform(role, "approvalSettings", "createTemplate")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createTemplate:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const stepsWithOrder = typedArgs.steps.map((step, index) => ({
              stepOrder: index + 1,
              approverRole: step.approverRole,
              deadlineHours: step.deadlineHours,
              condition: step.condition,
            }));

            const result = await createTemplate({
              name: typedArgs.name,
              steps: stepsWithOrder,
              fields: typedArgs.fields,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.template);
          }

          case "update": {
            if (!canPerform(role, "approvalSettings", "editTemplate")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateTemplate:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const stepsWithOrder = typedArgs.steps
              ? typedArgs.steps.map((step, index) => ({
                  stepOrder: index + 1,
                  approverRole: step.approverRole,
                  deadlineHours: step.deadlineHours,
                  condition: step.condition,
                }))
              : undefined;

            const result = await updateTemplate({
              id: typedArgs.templateId,
              name: typedArgs.name,
              steps: stepsWithOrder,
              fields: typedArgs.fields,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.template);
          }

          case "delete": {
            if (!canPerform(role, "approvalSettings", "deleteTemplate")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:deleteTemplate:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await deleteTemplate({
              id: typedArgs.templateId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, templateId: typedArgs.templateId });
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
