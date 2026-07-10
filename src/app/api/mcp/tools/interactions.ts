import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { createMeeting } from "@/application/usecases/createMeeting";
import { updateMeeting } from "@/application/usecases/updateMeeting";
import { listClientContacts } from "@/application/usecases/listClientContacts";
import { createContractAdjustment } from "@/application/usecases/createContractAdjustment";
import { createInvoiceAdjustment } from "@/application/usecases/createInvoiceAdjustment";
import { dealRepository, inquiryRepository, interactionRepository } from "@/infrastructure/repositories";
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
  notes: z.string().nullable().optional().describe("ヒアリングのメモ・補足事項"),
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
  internalAttendees: z.array(z.string()).optional(),
  externalContactIds: z
    .array(z.string().uuid())
    .optional()
    .describe(
      "社外参加者の顧客担当者ID（UUID）リスト。顧客に登録済みの担当者IDを指定する。未登録IDはエラー。氏名はサーバ側で解決される。create_meeting では dealId/inquiryId に紐づく顧客の担当者IDを指定すること。update_meeting では省略時は既存の外部参加者を保持する（null を指定するとクリア）。"
    ),
  summary: z.string().optional().describe("議事録・商談要約の本文。Markdown 記法・改行が反映される"),
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
  internalAttendees: z
    .array(z.string())
    .nullable()
    .optional()
    .describe(
      "社内参加者の名前リスト。指定した場合のみ内部参加者を差し替える。省略時は既存の内部参加者を保持する（externalContactIds とは独立して部分更新される）。null を指定すると内部参加者をクリアする。"
    ),
  externalContactIds: z
    .array(z.string().uuid())
    .nullable()
    .optional()
    .describe(
      "社外参加者の顧客担当者ID（UUID）リスト。指定した場合のみ外部参加者を差し替える。省略時は既存の外部参加者を保持する（internalAttendees とは独立して部分更新される）。null を指定すると外部参加者をクリアする。顧客に登録済みの担当者IDを指定する。未登録IDはエラー。氏名はサーバ側で解決される。"
    ),
  summary: z.string().nullable().optional().describe("議事録・商談要約の本文。Markdown 記法・改行が反映される"),
  actionItems: z.array(legacyActionItemSchema).optional(),
  hearingData: hearingDataSchema.nullable().optional(),
});

const recordContractAdjustmentSchema = z.object({
  operation: z.literal("record_contract_adjustment"),
  contractId: z.string().uuid("契約IDが不正です").describe("契約ID（UUID）"),
  summary: z.string().min(1, "要約は必須です").describe("契約調整の要約（必須）"),
  date: dateString.optional().describe("実施日時"),
  details: z.string().optional().describe("補足・詳細情報"),
});

const recordInvoiceAdjustmentSchema = z.object({
  operation: z.literal("record_invoice_adjustment"),
  invoiceId: z.string().uuid("請求IDが不正です").describe("請求ID（UUID）"),
  summary: z.string().min(1, "要約は必須です").describe("請求調整の要約（必須）"),
  date: dateString.optional().describe("実施日時"),
  details: z.string().optional().describe("補足・詳細情報"),
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
            ];

            // 社外参加者 ID を顧客担当者マスタで解決する
            if (typedArgs.externalContactIds && typedArgs.externalContactIds.length > 0) {
              // dealId または inquiryId から clientId を解決する
              let clientId: string | null = null;
              if (typedArgs.dealId) {
                const deal = await dealRepository.findById(typedArgs.dealId, organizationId);
                if (deal) clientId = deal.clientId;
              } else if (typedArgs.inquiryId) {
                const inquiry = await inquiryRepository.findById(typedArgs.inquiryId, organizationId);
                if (inquiry) clientId = inquiry.clientId;
              }

              if (!clientId) {
                return toToolError("社外参加者を追加するには顧客の設定が必要です");
              }

              const contacts = await listClientContacts(clientId, organizationId);
              const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

              const unresolvedIds = typedArgs.externalContactIds.filter((id) => !contactMap.has(id));
              if (unresolvedIds.length > 0) {
                return toToolError(`未登録の担当者IDが含まれています: ${unresolvedIds.join(", ")}`);
              }

              for (const contactId of typedArgs.externalContactIds) {
                attendees.push({
                  userId: null,
                  contactId,
                  name: contactMap.get(contactId)!,
                  isExternal: true,
                });
              }
            }

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

            // internalAttendees は独立した部分更新フィールドとして usecase に渡す。
            // undefined（省略）→ usecase でその側の既存参加者を保持
            // null（明示クリア）→ 空配列として変換（その側をクリア）
            // string[]（指定）→ MeetingAttendee[] に変換してその側を差し替え
            const internalAttendees: MeetingAttendee[] | undefined =
              typedArgs.internalAttendees === undefined
                ? undefined
                : (typedArgs.internalAttendees ?? []).map((name) => ({
                    userId: null as string | null,
                    contactId: null as string | null,
                    name,
                    isExternal: false,
                  }));

            // externalContactIds の三値意味論:
            // undefined → externalAttendees undefined（既存を保持）
            // null → externalAttendees []（クリア）
            // string[] → contactId 解決後 MeetingAttendee[]（差し替え）
            let externalAttendees: MeetingAttendee[] | undefined;
            if (typedArgs.externalContactIds === undefined) {
              externalAttendees = undefined;
            } else if (typedArgs.externalContactIds === null) {
              externalAttendees = [];
            } else if (typedArgs.externalContactIds.length === 0) {
              externalAttendees = [];
            } else {
              // contactId を顧客担当者マスタで解決する
              // meetingId から既存 interaction を取得し dealId / inquiryId を参照する
              const existing = await interactionRepository.findById(
                typedArgs.meetingId,
                organizationId
              );
              if (!existing) {
                return toToolError("商談が見つかりません");
              }

              let clientId: string | null = null;
              if (existing.dealId) {
                const deal = await dealRepository.findById(existing.dealId, organizationId);
                if (deal) clientId = deal.clientId;
              } else if (existing.inquiryId) {
                const inquiry = await inquiryRepository.findById(existing.inquiryId, organizationId);
                if (inquiry) clientId = inquiry.clientId;
              }

              if (!clientId) {
                return toToolError("社外参加者を追加するには顧客の設定が必要です");
              }

              const contacts = await listClientContacts(clientId, organizationId);
              const contactMap = new Map(contacts.map((c) => [c.id, c.name]));

              const unresolvedIds = typedArgs.externalContactIds.filter((id) => !contactMap.has(id));
              if (unresolvedIds.length > 0) {
                return toToolError(`未登録の担当者IDが含まれています: ${unresolvedIds.join(", ")}`);
              }

              externalAttendees = typedArgs.externalContactIds.map((contactId) => ({
                userId: null as string | null,
                contactId,
                name: contactMap.get(contactId)!,
                isExternal: true,
              }));
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
              internalAttendees,
              externalAttendees,
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
