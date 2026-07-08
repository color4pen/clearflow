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
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
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
  clientId: z.string().uuid().optional().describe("顧客ID（UUID）"),
  newClientName: z.string().min(1).optional().describe("新規顧客名 — 顧客を同時作成する場合に指定"),
  title: z.string().min(1, "件名は必須です").describe("件名"),
  description: z.string().optional(),
  contactNote: z.string().optional().describe("連絡メモ"),
  source: z
    .enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"])
    .describe("問い合わせ元"),
  assigneeId: z.string().uuid().optional().describe("担当者ID（UUID）"),
  budget: z.number().int().optional().describe("予算（整数）"),
  timeline: z.string().optional().describe("希望時期"),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  inquiryId: z.string().uuid().describe("引合ID（UUID）"),
  title: z.string().min(1).optional().describe("件名"),
  description: z.string().optional(),
  contactNote: z.string().optional().describe("連絡メモ"),
  source: z
    .enum(["web", "phone", "email", "referral", "agent_service", "exhibition", "other"])
    .optional(),
  clientId: z.string().uuid().optional().describe("顧客ID（UUID）"),
  assigneeId: z.string().uuid().optional().describe("担当者ID（UUID）"),
  budget: z.number().int().optional(),
  timeline: z.string().optional().describe("希望時期"),
});

const updateStatusSchema = z.object({
  operation: z.literal("update_status"),
  inquiryId: z.string().uuid().describe("引合ID（UUID）"),
  newStatus: z.enum(["new", "converted", "declined"]).describe("new=新規, converted=案件化, declined=辞退"),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  inquiryId: z.string().uuid().describe("引合ID（UUID）"),
});

const inquiriesInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  updateSchema,
  updateStatusSchema,
  deleteSchema,
]);

const inquiriesAdvertisementSchema = buildAdvertisementSchema([
  createSchema,
  listSchema,
  updateSchema,
  updateStatusSchema,
  deleteSchema,
]);

export function registerInquiriesTools(server: McpServer): void {
  server.registerTool(
    "inquiries",
    {
      description:
        "引合管理。引合（Inquiry）・問い合わせ・見込み・リード（lead）の一覧・作成・更新・ステータス変更・削除。予算・ソース・ステータス（new/converted/declined）を管理する。operation: list/create/update/update_status/delete",
      inputSchema: inquiriesAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(inquiriesInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof inquiriesInputSchema>;

        switch (typedArgs.operation) {
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
            let resolvedClientId: string | null = typedArgs.clientId ?? null;
            if (typedArgs.newClientName && !typedArgs.clientId) {
              const clientResult = await createClient({
                name: typedArgs.newClientName,
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
              title: typedArgs.title,
              description: typedArgs.description ?? null,
              contactNote: typedArgs.contactNote ?? null,
              source: typedArgs.source,
              assigneeId: typedArgs.assigneeId ?? null,
              budget: typedArgs.budget ?? null,
              timeline: typedArgs.timeline ?? null,
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
              inquiryId: typedArgs.inquiryId,
              organizationId,
              actorId: userId,
              title: typedArgs.title,
              description: typedArgs.description,
              contactNote: typedArgs.contactNote,
              source: typedArgs.source,
              clientId: typedArgs.clientId,
              assigneeId: typedArgs.assigneeId,
              budget: typedArgs.budget,
              timeline: typedArgs.timeline,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.inquiry);
          }

          case "update_status": {
            const { newStatus } = typedArgs;
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
              inquiryId: typedArgs.inquiryId,
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
              id: typedArgs.inquiryId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, inquiryId: typedArgs.inquiryId });
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
