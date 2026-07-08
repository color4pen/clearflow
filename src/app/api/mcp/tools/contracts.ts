import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { listContracts } from "@/application/usecases/listContracts";
import { getContract } from "@/application/usecases/getContract";
import { createContract } from "@/application/usecases/createContract";
import { updateContract } from "@/application/usecases/updateContract";
import { updateContractStatus } from "@/application/usecases/updateContractStatus";
import { deleteContract } from "@/application/usecases/deleteContract";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";
import type { ContractStatus } from "@/domain/models/contract";

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

const listSchema = z.object({
  operation: z.literal("list"),
});

const getSchema = z.object({
  operation: z.literal("get"),
  contractId: z.string().uuid("契約IDが不正です").describe("契約ID（UUID）"),
});

const createSchema = z.object({
  operation: z.literal("create"),
  dealId: z.string().uuid("案件IDが不正です").describe("案件ID（UUID）"),
  amount: z.number().int().positive("金額は正の整数を指定してください").describe("契約金額（正の整数、円）"),
  startDate: dateString.describe("契約開始日"),
  title: z.string().optional(),
  contractType: z
    .enum(["quasi_delegation", "fixed_price", "ses"])
    .optional()
    .describe("quasi_delegation=準委任, fixed_price=請負, ses=SES"),
  endDate: dateString.optional().describe("契約終了日"),
  paymentTerms: z.string().optional().describe("支払条件"),
  renewalType: z.enum(["one_time", "recurring"]).optional().describe("one_time=一回限り, recurring=自動更新"),
  renewalCycle: z.string().optional().describe("更新サイクル"),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  contractId: z.string().uuid("契約IDが不正です").describe("契約ID（UUID）"),
  title: z.string().min(1).optional(),
  contractType: z
    .enum(["quasi_delegation", "fixed_price", "ses"])
    .nullable()
    .optional()
    .describe("quasi_delegation=準委任, fixed_price=請負, ses=SES"),
  amount: z.number().int().positive().optional().describe("契約金額（正の整数、円）"),
  startDate: dateString.optional().describe("契約開始日"),
  endDate: dateString.nullable().optional().describe("契約終了日"),
  paymentTerms: z.string().nullable().optional().describe("支払条件"),
  renewalType: z.enum(["one_time", "recurring"]).optional().describe("one_time=一回限り, recurring=自動更新"),
  renewalCycle: z.string().nullable().optional().describe("更新サイクル"),
});

const updateStatusSchema = z.object({
  operation: z.literal("update_status"),
  contractId: z.string().uuid("契約IDが不正です").describe("契約ID（UUID）"),
  newStatus: z.enum(["active", "completed", "cancelled"]).describe("active=有効, completed=完了, cancelled=解約"),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  contractId: z.string().uuid("契約IDが不正です").describe("契約ID（UUID）"),
});

const contractsInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  getSchema,
  createSchema,
  updateSchema,
  updateStatusSchema,
  deleteSchema,
]);

const contractsAdvertisementSchema = buildAdvertisementSchema([
  listSchema,
  getSchema,
  createSchema,
  updateSchema,
  updateStatusSchema,
  deleteSchema,
]);

export function registerContractsTools(server: McpServer): void {
  server.registerTool(
    "contracts",
    {
      description:
        "契約管理。受注後の契約（Contract）・契約書・受注の一覧・詳細・作成・更新・ステータス変更・削除。契約種別（準委任/請負/SES）・金額・期間・更新条件を扱う。operation: list/get/create/update/update_status/delete",
      inputSchema: contractsAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(contractsInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof contractsInputSchema>;

        switch (typedArgs.operation) {
          case "list": {
            if (!canPerform(role, "contract", "list")) {
              return toToolError("権限がありません");
            }
            const contracts = await listContracts(organizationId);
            return toToolSuccess(contracts);
          }

          case "get": {
            if (!canPerform(role, "contract", "view")) {
              return toToolError("権限がありません");
            }
            const contract = await getContract({
              contractId: typedArgs.contractId,
              organizationId,
            });
            if (!contract) {
              return toToolError("契約が見つかりません");
            }
            return toToolSuccess(contract);
          }

          case "create": {
            if (!canPerform(role, "contract", "create")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createContract:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await createContract({
              dealId: typedArgs.dealId,
              organizationId,
              actorId: userId,
              title: typedArgs.title,
              contractType: typedArgs.contractType,
              amount: typedArgs.amount,
              startDate: new Date(typedArgs.startDate),
              endDate: typedArgs.endDate !== undefined ? new Date(typedArgs.endDate) : undefined,
              paymentTerms: typedArgs.paymentTerms,
              renewalType: typedArgs.renewalType,
              renewalCycle: typedArgs.renewalCycle,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.contract);
          }

          case "update": {
            if (!canPerform(role, "contract", "edit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateContract:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            // startDate: undefined（変更なし）、文字列（Date に変換）を区別する
            const startDate =
              typedArgs.startDate === undefined ? undefined : new Date(typedArgs.startDate);

            // endDate: undefined（変更なし）、null（クリア）、文字列（Date に変換）を区別する
            const endDate =
              typedArgs.endDate === undefined
                ? undefined
                : typedArgs.endDate === null
                  ? null
                  : new Date(typedArgs.endDate);

            const result = await updateContract({
              contractId: typedArgs.contractId,
              organizationId,
              actorId: userId,
              title: typedArgs.title,
              contractType: typedArgs.contractType,
              amount: typedArgs.amount,
              startDate,
              endDate,
              paymentTerms: typedArgs.paymentTerms,
              renewalType: typedArgs.renewalType,
              renewalCycle: typedArgs.renewalCycle,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.contract);
          }

          case "update_status": {
            if (!canPerform(role, "contract", "changeStatus")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateContractStatus:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateContractStatus({
              contractId: typedArgs.contractId,
              organizationId,
              actorId: userId,
              newStatus: typedArgs.newStatus as ContractStatus,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.contract);
          }

          case "delete": {
            if (!canPerform(role, "contract", "delete")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:deleteContract:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await deleteContract({
              id: typedArgs.contractId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, contractId: typedArgs.contractId });
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
