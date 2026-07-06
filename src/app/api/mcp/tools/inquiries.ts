import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import {
  createInquiry,
  updateInquiry,
  updateInquiryStatus,
  deleteInquiry,
  listInquiries,
  createClient,
} from "@/application/usecases";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const listSchema = z.object({
  operation: z.literal("list"),
  status: z.string().optional(),
  source: z.string().optional(),
});

const createSchema = z.object({
  operation: z.literal("create"),
  clientId: z.string().uuid().optional(),
  newClientName: z.string().min(1).optional(),
  title: z.string().min(1, "件名は必須です"),
  description: z.string().optional(),
  contactNote: z.string().optional(),
  source: z.enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"]),
  assigneeId: z.string().uuid().optional(),
  budget: z.number().int().optional(),
  timeline: z.string().optional(),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  inquiryId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  contactNote: z.string().optional(),
  source: z
    .enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"])
    .optional(),
  clientId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  budget: z.number().int().optional(),
  timeline: z.string().optional(),
});

const updateStatusSchema = z.object({
  operation: z.literal("update_status"),
  inquiryId: z.string().uuid(),
  newStatus: z.enum(["new", "converted", "declined"]),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  inquiryId: z.string().uuid(),
});

const inquiriesInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  updateSchema,
  updateStatusSchema,
  deleteSchema,
]);

export function registerInquiriesTools(server: McpServer): void {
  server.registerTool(
    "inquiries",
    {
      description:
        "引合（Inquiry）の一覧取得・作成・更新・ステータス更新・削除を行います。operation 引数で操作を切り替えます。",
      inputSchema: inquiriesInputSchema,
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
            if (!canPerform(role, "inquiry", "list")) {
              return toToolError("権限がありません");
            }
            const inquiries = await listInquiries(organizationId);
            return toToolSuccess(inquiries);
          }

          case "create": {
            if (!canPerform(role, "inquiry", "create")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createInquiry:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            // 新規顧客名が指定されており clientId が未指定の場合、顧客を先に作成する
            let resolvedClientId: string | null = args.clientId ?? null;
            if (args.newClientName && !args.clientId) {
              const clientResult = await createClient({
                name: args.newClientName,
                organizationId,
                actorId: userId,
              });
              if (!clientResult.ok) {
                return toToolError(clientResult.reason);
              }
              resolvedClientId = clientResult.client.id;
            }

            const result = await createInquiry({
              organizationId,
              actorId: userId,
              clientId: resolvedClientId,
              title: args.title,
              description: args.description ?? null,
              contactNote: args.contactNote ?? null,
              source: args.source,
              assigneeId: args.assigneeId ?? null,
              budget: args.budget ?? null,
              timeline: args.timeline ?? null,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.inquiry);
          }

          case "update": {
            if (!canPerform(role, "inquiry", "edit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateInquiry:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateInquiry({
              inquiryId: args.inquiryId,
              organizationId,
              actorId: userId,
              title: args.title,
              description: args.description,
              contactNote: args.contactNote,
              source: args.source,
              clientId: args.clientId,
              assigneeId: args.assigneeId,
              budget: args.budget,
              timeline: args.timeline,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.inquiry);
          }

          case "update_status": {
            const { newStatus } = args;
            if (newStatus === "converted") {
              if (!canPerform(role, "inquiry", "convert")) {
                return toToolError("権限がありません");
              }
            } else if (newStatus === "declined") {
              if (!canPerform(role, "inquiry", "decline")) {
                return toToolError("権限がありません");
              }
            }

            const rateCheck = await checkRateLimit({
              key: `mcp:updateInquiryStatus:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateInquiryStatus({
              inquiryId: args.inquiryId,
              organizationId,
              actorId: userId,
              newStatus,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }

            if (result.pendingApproval) {
              return toToolSuccess({
                inquiry: result.inquiry,
                pendingApproval: result.pendingApproval,
                message:
                  "承認リクエストを作成しました。承認後に案件が自動生成されます。",
              });
            }

            return toToolSuccess(result.inquiry);
          }

          case "delete": {
            if (!canPerform(role, "inquiry", "delete")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:deleteInquiry:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await deleteInquiry({
              id: args.inquiryId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, inquiryId: args.inquiryId });
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
