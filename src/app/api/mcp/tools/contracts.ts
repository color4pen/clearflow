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
import type { Role } from "@/domain/models/user";
import type { ContractStatus } from "@/domain/models/contract";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

const listSchema = z.object({
  operation: z.literal("list"),
});

const getSchema = z.object({
  operation: z.literal("get"),
  contractId: z.string().uuid("契約IDが不正です"),
});

const createSchema = z.object({
  operation: z.literal("create"),
  dealId: z.string().uuid("案件IDが不正です"),
  amount: z.number().int().positive("金額は正の整数を指定してください"),
  startDate: z.string(),
  title: z.string().optional(),
  contractType: z.enum(["quasi_delegation", "fixed_price", "ses"]).optional(),
  endDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  renewalType: z.enum(["one_time", "recurring"]).optional(),
  renewalCycle: z.string().optional(),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  contractId: z.string().uuid("契約IDが不正です"),
  title: z.string().min(1).optional(),
  contractType: z.enum(["quasi_delegation", "fixed_price", "ses"]).nullable().optional(),
  amount: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  renewalType: z.enum(["one_time", "recurring"]).optional(),
  renewalCycle: z.string().nullable().optional(),
});

const updateStatusSchema = z.object({
  operation: z.literal("update_status"),
  contractId: z.string().uuid("契約IDが不正です"),
  newStatus: z.enum(["active", "completed", "cancelled"]),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  contractId: z.string().uuid("契約IDが不正です"),
});

const contractsInputSchema = z.discriminatedUnion("operation", [
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
        "契約（Contract）の一覧取得・詳細取得・作成・更新・ステータス更新・削除を行います。operation 引数で操作を切り替えます。",
      inputSchema: contractsInputSchema,
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
              contractId: args.contractId,
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
              dealId: args.dealId,
              organizationId,
              actorId: userId,
              title: args.title,
              contractType: args.contractType,
              amount: args.amount,
              startDate: new Date(args.startDate),
              endDate: args.endDate !== undefined ? new Date(args.endDate) : undefined,
              paymentTerms: args.paymentTerms,
              renewalType: args.renewalType,
              renewalCycle: args.renewalCycle,
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
              args.startDate === undefined ? undefined : new Date(args.startDate);

            // endDate: undefined（変更なし）、null（クリア）、文字列（Date に変換）を区別する
            const endDate =
              args.endDate === undefined
                ? undefined
                : args.endDate === null
                  ? null
                  : new Date(args.endDate);

            const result = await updateContract({
              contractId: args.contractId,
              organizationId,
              actorId: userId,
              title: args.title,
              contractType: args.contractType,
              amount: args.amount,
              startDate,
              endDate,
              paymentTerms: args.paymentTerms,
              renewalType: args.renewalType,
              renewalCycle: args.renewalCycle,
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
              contractId: args.contractId,
              organizationId,
              actorId: userId,
              newStatus: args.newStatus as ContractStatus,
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
              id: args.contractId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess({ deleted: true, contractId: args.contractId });
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
