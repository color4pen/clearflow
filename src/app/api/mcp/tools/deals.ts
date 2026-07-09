import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import {
  createDeal,
  listDeals,
  getDeal,
  updateDeal,
  updateDealPhase,
  deleteDeal,
  listDealContacts,
  getDealActivity,
} from "@/application/usecases";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";
import type { ContractType, DealPhase } from "@/domain/models/deal";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const listSchema = z.object({
  operation: z.literal("list"),
  phase: z.string().optional(),
  clientId: z.string().uuid().optional().describe("顧客ID（UUID）"),
});

const getSchema = z.object({
  operation: z.literal("get"),
  dealId: z.string().uuid().describe("案件ID（UUID）"),
});

const createSchema = z.object({
  operation: z.literal("create"),
  inquiryId: z.string().uuid().optional().describe("引合ID（UUID）"),
  clientId: z.string().uuid().optional().describe("顧客ID（UUID）"),
  title: z.string().min(1, "案件名は必須です").describe("案件名"),
  description: z.string().optional().describe("案件の概要説明"),
  estimatedAmount: z.number().int().optional().describe("見積金額（整数、円）"),
  estimatedStartDate: z.string().optional().describe("見積開始日"),
  estimatedEndDate: z.string().optional().describe("見積終了日"),
  contractType: z
    .enum(["quasi_delegation", "fixed_price", "ses"])
    .optional()
    .describe("quasi_delegation=準委任, fixed_price=請負, ses=SES"),
  assigneeId: z.string().uuid().optional().describe("営業担当ID（UUID）"),
  technicalLeadId: z.string().uuid().optional().describe("技術担当ID（UUID）"),
  notes: z.string().optional().describe("案件の備考・共有メモ。Markdown 記法・改行が反映される"),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  dealId: z.string().uuid().describe("案件ID（UUID）"),
  title: z.string().min(1).optional().describe("案件名"),
  description: z.string().nullable().optional().describe("案件の概要説明"),
  estimatedAmount: z.number().int().nullable().optional().describe("見積金額（整数、円）"),
  estimatedStartDate: z.string().nullable().optional().describe("見積開始日"),
  estimatedEndDate: z.string().nullable().optional().describe("見積終了日"),
  contractType: z
    .enum(["quasi_delegation", "fixed_price", "ses"])
    .nullable()
    .optional()
    .describe("quasi_delegation=準委任, fixed_price=請負, ses=SES"),
  assigneeId: z.string().uuid().nullable().optional().describe("営業担当ID（UUID）"),
  technicalLeadId: z.string().uuid().nullable().optional().describe("技術担当ID（UUID）"),
  notes: z.string().nullable().optional().describe("案件の備考・共有メモ。Markdown 記法・改行が反映される"),
});

const updatePhaseSchema = z.object({
  operation: z.literal("update_phase"),
  dealId: z.string().uuid().describe("案件ID（UUID）"),
  newPhase: z
    .enum(["hearing", "proposal_prep", "proposed", "negotiation", "won", "lost", "passed"])
    .describe("hearing=ヒアリング, proposal_prep=提案準備, proposed=提案済, negotiation=交渉中, won=受注, lost=失注, passed=見送り"),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  dealId: z.string().uuid().describe("案件ID（UUID）"),
});

const dealsInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  getSchema,
  createSchema,
  updateSchema,
  updatePhaseSchema,
  deleteSchema,
]);

const dealsAdvertisementSchema = buildAdvertisementSchema([
  listSchema,
  getSchema,
  createSchema,
  updateSchema,
  updatePhaseSchema,
  deleteSchema,
]);

export function registerDealsTools(server: McpServer): void {
  server.registerTool(
    "deals",
    {
      description:
        "案件管理。案件（Deal）・商談・opportunity の一覧・詳細・作成・更新・フェーズ更新・削除。フェーズ（hearing〜won/lost/passed）・見積金額・契約種別（準委任/請負/SES）を管理する。operation: list/get/create/update/update_phase/delete",
      inputSchema: dealsAdvertisementSchema,
    },
    async (_rawArgs, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(dealsInputSchema, _rawArgs);
        if (parseResult) return parseResult;
        const args = _rawArgs as z.infer<typeof dealsInputSchema>;

        switch (args.operation) {
          case "list": {
            if (!canPerform(role, "deal", "list")) {
              return toToolError("権限がありません");
            }
            const deals = await listDeals(organizationId);
            return toToolSuccess(deals);
          }

          case "get": {
            if (!canPerform(role, "deal", "view")) {
              return toToolError("権限がありません");
            }
            const deal = await getDeal(args.dealId, organizationId);
            if (!deal) {
              return toToolError("案件が見つかりません");
            }
            const [contacts, activity] = await Promise.all([
              listDealContacts(args.dealId, organizationId),
              getDealActivity({
                dealId: args.dealId,
                organizationId,
                dealTitle: deal.title,
              }),
            ]);
            return toToolSuccess({
              deal,
              contacts,
              timeline: activity.logs,
            });
          }

          case "create": {
            if (!canPerform(role, "deal", "create")) {
              return toToolError("権限がありません");
            }
            // inquiryId も clientId もない場合はエラー
            if (!args.inquiryId && !args.clientId) {
              return toToolError("顧客または引き合いの指定が必要です");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createDeal:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await createDeal({
              organizationId,
              actorId: userId,
              inquiryId: args.inquiryId,
              clientId: args.clientId,
              title: args.title,
              description: args.description ?? null,
              estimatedAmount: args.estimatedAmount ?? null,
              estimatedStartDate: args.estimatedStartDate
                ? new Date(args.estimatedStartDate)
                : null,
              estimatedEndDate: args.estimatedEndDate
                ? new Date(args.estimatedEndDate)
                : null,
              contractType: (args.contractType as ContractType) ?? null,
              assigneeId: args.assigneeId ?? null,
              technicalLeadId: args.technicalLeadId ?? null,
              notes: args.notes ?? null,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.deal);
          }

          case "update": {
            if (!canPerform(role, "deal", "edit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateDeal:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateDeal({
              dealId: args.dealId,
              organizationId,
              actorId: userId,
              title: args.title,
              description: args.description,
              estimatedAmount: args.estimatedAmount,
              estimatedStartDate:
                args.estimatedStartDate === undefined
                  ? undefined
                  : args.estimatedStartDate === null
                    ? null
                    : new Date(args.estimatedStartDate),
              estimatedEndDate:
                args.estimatedEndDate === undefined
                  ? undefined
                  : args.estimatedEndDate === null
                    ? null
                    : new Date(args.estimatedEndDate),
              contractType: args.contractType,
              assigneeId: args.assigneeId,
              technicalLeadId: args.technicalLeadId,
              notes: args.notes,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.deal);
          }

          case "update_phase": {
            const { newPhase } = args;
            const isTerminalPhase = newPhase === "won" || newPhase === "lost" || newPhase === "passed";
            const requiredOperation = isTerminalPhase ? "closePhase" : "changePhase";
            if (!canPerform(role, "deal", requiredOperation)) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateDealPhase:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateDealPhase({
              dealId: args.dealId,
              organizationId,
              actorId: userId,
              newPhase: newPhase as DealPhase,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.deal);
          }

          case "delete": {
            if (!canPerform(role, "deal", "delete")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:deleteDeal:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await deleteDeal({
              id: args.dealId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, dealId: args.dealId });
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
