import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { listInvoicesByContract } from "@/application/usecases/listInvoicesByContract";
import { listInvoicesByOrganization } from "@/application/usecases/listInvoicesByOrganization";
import { createInvoice } from "@/application/usecases/createInvoice";
import { updateInvoice } from "@/application/usecases/updateInvoice";
import { updateInvoiceStatus } from "@/application/usecases/updateInvoiceStatus";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
import type { Role } from "@/domain/models/user";
import type { InvoiceStatus } from "@/domain/models/invoice";

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

/** YYYY-MM-DD 形式の日付（Server Action と同じ制約。todayJST との辞書順比較を安全にする）。 */
const ymdDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で指定してください");

const listSchema = z.object({
  operation: z.literal("list"),
  contractId: z.string().uuid().optional(),
  status: z.enum(["scheduled", "invoiced", "paid", "overdue"]).optional(),
  paidAtFrom: dateString.optional(),
  paidAtTo: dateString.optional(),
  issueDateFrom: dateString.optional(),
  issueDateTo: dateString.optional(),
});

const createSchema = z.object({
  operation: z.literal("create"),
  contractId: z.string().uuid("契約IDが不正です"),
  title: z.string().min(1, "タイトルは必須です"),
  amount: z.number().int().positive("金額は正の整数を指定してください"),
  dueDate: dateString,
  issueDate: dateString.nullable().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  invoiceId: z.string().uuid("請求IDが不正です"),
  title: z.string().min(1).optional(),
  amount: z.number().int().positive().optional(),
  issueDate: dateString.nullable().optional(),
  dueDate: dateString.optional(),
  notes: z.string().nullable().optional(),
});

const updateStatusSchema = z.object({
  operation: z.literal("update_status"),
  invoiceId: z.string().uuid("請求IDが不正です"),
  newStatus: z.enum(["scheduled", "invoiced", "paid", "overdue"]),
  paidAt: ymdDateString.optional(),
});

const invoicesInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  updateSchema,
  updateStatusSchema,
]);

const invoicesAdvertisementSchema = buildAdvertisementSchema([
  listSchema,
  createSchema,
  updateSchema,
  updateStatusSchema,
]);

export function registerInvoicesTools(server: McpServer): void {
  server.registerTool(
    "invoices",
    {
      description:
        "請求（Invoice）の一覧取得・作成・更新・ステータス更新を行います。operation 引数で操作を切り替えます。",
      inputSchema: invoicesAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { userId, organizationId, role } = auth;

        const parseResult = validateAndParse(invoicesInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof invoicesInputSchema>;

        switch (typedArgs.operation) {
          case "list": {
            if (!canPerform(role, "invoice", "list")) {
              return toToolError("権限がありません");
            }

            if (typedArgs.contractId !== undefined) {
              // contractId あり → 契約別一覧
              const invoices = await listInvoicesByContract({
                contractId: typedArgs.contractId,
                organizationId,
              });
              return toToolSuccess(invoices);
            } else {
              // contractId なし → 組織全体の一覧（フィルタあり）
              const invoices = await listInvoicesByOrganization({
                organizationId,
                status: typedArgs.status as InvoiceStatus | undefined,
                paidAtFrom: typedArgs.paidAtFrom !== undefined ? new Date(typedArgs.paidAtFrom) : undefined,
                paidAtTo: typedArgs.paidAtTo !== undefined ? new Date(typedArgs.paidAtTo) : undefined,
                issueDateFrom:
                  typedArgs.issueDateFrom !== undefined ? new Date(typedArgs.issueDateFrom) : undefined,
                issueDateTo:
                  typedArgs.issueDateTo !== undefined ? new Date(typedArgs.issueDateTo) : undefined,
              });
              return toToolSuccess(invoices);
            }
          }

          case "create": {
            if (!canPerform(role, "invoice", "create")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createInvoice:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            // issueDate: undefined（未指定）、null（null として渡す）、文字列（Date に変換）を区別する
            const issueDate =
              typedArgs.issueDate === undefined
                ? undefined
                : typedArgs.issueDate === null
                  ? null
                  : new Date(typedArgs.issueDate);

            const result = await createInvoice({
              contractId: typedArgs.contractId,
              organizationId,
              actorId: userId,
              title: typedArgs.title,
              amount: typedArgs.amount,
              dueDate: new Date(typedArgs.dueDate),
              issueDate,
              notes: typedArgs.notes,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.invoice);
          }

          case "update": {
            if (!canPerform(role, "invoice", "edit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateInvoice:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            // issueDate: undefined（変更なし）、null（クリア）、文字列（Date に変換）を区別する
            const issueDate =
              typedArgs.issueDate === undefined
                ? undefined
                : typedArgs.issueDate === null
                  ? null
                  : new Date(typedArgs.issueDate);

            // dueDate: undefined（変更なし）、文字列（Date に変換）を区別する
            const dueDate =
              typedArgs.dueDate === undefined ? undefined : new Date(typedArgs.dueDate);

            const result = await updateInvoice({
              invoiceId: typedArgs.invoiceId,
              organizationId,
              actorId: userId,
              title: typedArgs.title,
              amount: typedArgs.amount,
              issueDate,
              dueDate,
              notes: typedArgs.notes,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.invoice);
          }

          case "update_status": {
            if (!canPerform(role, "invoice", "changeStatus")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateInvoiceStatus:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            // paidAt が指定された場合、本日以前（JST）であることを検証する
            if (typedArgs.paidAt !== undefined) {
              const todayJST = new Intl.DateTimeFormat("sv", {
                timeZone: "Asia/Tokyo",
              }).format(new Date());
              if (typedArgs.paidAt > todayJST) {
                return toToolError("入金日は本日以前の日付を指定してください");
              }
            }

            // paidAt: 省略時は undefined（usecase のデフォルトに委ねる）、指定時は Date に変換
            const paidAt =
              typedArgs.paidAt !== undefined ? new Date(typedArgs.paidAt) : undefined;

            const result = await updateInvoiceStatus({
              invoiceId: typedArgs.invoiceId,
              organizationId,
              actorId: userId,
              newStatus: typedArgs.newStatus as InvoiceStatus,
              paidAt,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.invoice);
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
