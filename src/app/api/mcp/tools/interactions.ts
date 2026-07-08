import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { createMeeting } from "@/application/usecases/createMeeting";
import { updateMeeting } from "@/application/usecases/updateMeeting";
import { createContractAdjustment } from "@/application/usecases/createContractAdjustment";
import { createInvoiceAdjustment } from "@/application/usecases/createInvoiceAdjustment";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";
import type { MeetingAttendee } from "@/domain/models/interaction";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

/** パース可能な日時文字列（不正な日付を new Date() 前に明確なエラーで弾く）。 */
const dateString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "日時の形式が不正です");

const hearingDataSchema = z.object({
  challenge: z.string().nullable().optional(),
  budget: z.string().nullable().optional(),
  decisionMaker: z.string().nullable().optional(),
  timeline: z.string().nullable().optional(),
  competitors: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const legacyActionItemSchema = z.object({
  description: z.string(),
  assignee: z.string(),
  dueDate: z.string().nullable(),
  done: z.boolean(),
});

const createMeetingSchema = z.object({
  operation: z.literal("create_meeting"),
  dealId: z.string().uuid().optional().describe("案件ID（UUID）"),
  inquiryId: z.string().uuid().optional().describe("引合ID（UUID）"),
  type: z
    .enum(["hearing", "proposal", "negotiation", "closing", "followup"])
    .describe("hearing=ヒアリング, proposal=提案, negotiation=交渉, closing=クロージング, followup=フォローアップ"),
  date: dateString.describe("実施日時"),
  location: z.string().optional().describe("場所"),
  internalAttendees: z.array(z.string()).optional().default([]),
  externalAttendees: z.array(z.string()).optional().default([]),
  summary: z.string().optional().describe("要約"),
  actionItems: z.array(legacyActionItemSchema).optional().default([]),
  hearingData: hearingDataSchema.optional(),
});

const updateMeetingSchema = z.object({
  operation: z.literal("update_meeting"),
  meetingId: z.string().uuid().describe("商談ID（UUID）"),
  type: z
    .enum(["hearing", "proposal", "negotiation", "closing", "followup"])
    .optional()
    .describe("hearing=ヒアリング, proposal=提案, negotiation=交渉, closing=クロージング, followup=フォローアップ"),
  date: dateString.optional().describe("実施日時"),
  location: z.string().nullable().optional().describe("場所"),
  internalAttendees: z.array(z.string()).nullable().optional(),
  externalAttendees: z.array(z.string()).nullable().optional(),
  summary: z.string().nullable().optional().describe("要約"),
  actionItems: z.array(legacyActionItemSchema).optional(),
  hearingData: hearingDataSchema.nullable().optional(),
});

const recordContractAdjustmentSchema = z.object({
  operation: z.literal("record_contract_adjustment"),
  contractId: z.string().uuid("契約IDが不正です").describe("契約ID（UUID）"),
  summary: z.string().min(1, "要約は必須です").describe("要約"),
  date: dateString.optional().describe("実施日時"),
  details: z.string().optional().describe("詳細"),
});

const recordInvoiceAdjustmentSchema = z.object({
  operation: z.literal("record_invoice_adjustment"),
  invoiceId: z.string().uuid("請求IDが不正です").describe("請求ID（UUID）"),
  summary: z.string().min(1, "要約は必須です").describe("要約"),
  date: dateString.optional().describe("実施日時"),
  details: z.string().optional().describe("詳細"),
});

const interactionsInputSchema = z.discriminatedUnion("operation", [
  createMeetingSchema,
  updateMeetingSchema,
  recordContractAdjustmentSchema,
  recordInvoiceAdjustmentSchema,
]);

const interactionsAdvertisementSchema = buildAdvertisementSchema([
  createMeetingSchema,
  updateMeetingSchema,
  recordContractAdjustmentSchema,
  recordInvoiceAdjustmentSchema,
]);

export function registerInteractionsTools(server: McpServer): void {
  server.registerTool(
    "interactions",
    {
      description:
        "顧客接点管理。商談（Interaction）・打ち合わせ・ミーティング（meeting）の記録・編集、契約調整・請求調整の記録。案件や引合に紐付く接触履歴を扱う。operation: create_meeting/update_meeting/record_contract_adjustment/record_invoice_adjustment",
      inputSchema: interactionsAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(interactionsInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof interactionsInputSchema>;

        switch (typedArgs.operation) {
          case "create_meeting": {
            if (!canPerform(role, "meeting", "create")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createMeeting:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const attendees: MeetingAttendee[] = [
              ...(typedArgs.internalAttendees ?? []).map((name) => ({
                userId: null as string | null,
                contactId: null as string | null,
                name,
                isExternal: false,
              })),
              ...(typedArgs.externalAttendees ?? []).map((name) => ({
                userId: null as string | null,
                contactId: null as string | null,
                name,
                isExternal: true,
              })),
            ];

            const hearingData = typedArgs.hearingData
              ? {
                  challenge: typedArgs.hearingData.challenge ?? null,
                  budget: typedArgs.hearingData.budget ?? null,
                  decisionMaker: typedArgs.hearingData.decisionMaker ?? null,
                  timeline: typedArgs.hearingData.timeline ?? null,
                  competitors: typedArgs.hearingData.competitors ?? null,
                  notes: typedArgs.hearingData.notes ?? null,
                }
              : undefined;

            const result = await createMeeting({
              organizationId,
              actorId: userId,
              kind: "meeting",
              dealId: typedArgs.dealId ?? null,
              inquiryId: typedArgs.inquiryId ?? null,
              meetingType: typedArgs.type,
              date: new Date(typedArgs.date),
              location: typedArgs.location ?? null,
              attendees,
              summary: typedArgs.summary ?? null,
              actionItems: typedArgs.actionItems ?? [],
              details: hearingData ?? null,
            });

            if (!result.ok) {
              return toToolError("商談の記録に失敗しました");
            }
            return toToolSuccess(result.meeting);
          }

          case "update_meeting": {
            if (!canPerform(role, "meeting", "edit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateMeeting:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            // attendees: internalAttendees / externalAttendees のいずれかが指定された場合のみ変換する
            let attendees: MeetingAttendee[] | undefined;
            if (typedArgs.internalAttendees !== undefined || typedArgs.externalAttendees !== undefined) {
              attendees = [
                ...(typedArgs.internalAttendees ?? []).map((name) => ({
                  userId: null as string | null,
                  contactId: null as string | null,
                  name,
                  isExternal: false,
                })),
                ...(typedArgs.externalAttendees ?? []).map((name) => ({
                  userId: null as string | null,
                  contactId: null as string | null,
                  name,
                  isExternal: true,
                })),
              ];
            }

            // hearingData: undefined（変更なし）と null（クリア）を区別する
            let details: { challenge: string | null; budget: string | null; decisionMaker: string | null; timeline: string | null; competitors: string | null; notes: string | null } | null | undefined;
            if (typedArgs.hearingData === undefined) {
              details = undefined;
            } else if (typedArgs.hearingData === null) {
              details = null;
            } else {
              details = {
                challenge: typedArgs.hearingData.challenge ?? null,
                budget: typedArgs.hearingData.budget ?? null,
                decisionMaker: typedArgs.hearingData.decisionMaker ?? null,
                timeline: typedArgs.hearingData.timeline ?? null,
                competitors: typedArgs.hearingData.competitors ?? null,
                notes: typedArgs.hearingData.notes ?? null,
              };
            }

            const result = await updateMeeting({
              meetingId: typedArgs.meetingId,
              organizationId,
              actorId: userId,
              meetingType: typedArgs.type,
              date: typedArgs.date ? new Date(typedArgs.date) : undefined,
              location: typedArgs.location,
              attendees,
              summary: typedArgs.summary,
              actionItems: typedArgs.actionItems,
              details,
            });

            if (!result.ok) {
              return toToolError("商談の更新に失敗しました");
            }
            return toToolSuccess(result.meeting);
          }

          case "record_contract_adjustment": {
            if (!canPerform(role, "interaction", "recordContractInteraction")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createContractAdjustment:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await createContractAdjustment({
              contractId: typedArgs.contractId,
              organizationId,
              actorId: userId,
              summary: typedArgs.summary,
              date: typedArgs.date ? new Date(typedArgs.date) : undefined,
              details: typedArgs.details ?? null,
            });

            if (!result.ok) {
              return toToolError("契約調整の記録に失敗しました");
            }
            return toToolSuccess(result.interaction);
          }

          case "record_invoice_adjustment": {
            if (!canPerform(role, "interaction", "recordInvoiceInteraction")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createInvoiceAdjustment:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await createInvoiceAdjustment({
              invoiceId: typedArgs.invoiceId,
              organizationId,
              actorId: userId,
              summary: typedArgs.summary,
              date: typedArgs.date ? new Date(typedArgs.date) : undefined,
              details: typedArgs.details ?? null,
            });

            if (!result.ok) {
              return toToolError("請求調整の記録に失敗しました");
            }
            return toToolSuccess(result.interaction);
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
