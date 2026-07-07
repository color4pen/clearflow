import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { listRequests } from "@/application/usecases/listRequests";
import { getRequest } from "@/application/usecases/getRequest";
import { getApprovalSteps } from "@/application/usecases/getApprovalSteps";
import { createRequest } from "@/application/usecases/createRequest";
import { submitRequest } from "@/application/usecases/submitRequest";
import { approveRequest } from "@/application/usecases/approveRequest";
import { rejectRequest } from "@/application/usecases/rejectRequest";
import { bulkApprove } from "@/application/usecases/bulkApprove";
import { resubmitRequest } from "@/application/usecases/resubmitRequest";
import * as approvalTemplateRepository from "@/infrastructure/repositories/approvalTemplateRepository";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import type { Role } from "@/domain/models/user";

function getAuthInfo(extra: RequestHandlerExtra<ServerRequest, ServerNotification>) {
  const authExtra = extra.authInfo?.extra as
    | { userId: string; organizationId: string; role: Role }
    | undefined;
  return authExtra ?? null;
}

/**
 * usecase の result.reason をサニタイズする。
 * DB 固有エラーがクライアントに漏れないよう、既知の業務エラー以外は固定文言に差し替える。
 */
const KNOWN_APPROVAL_REASONS = new Set([
  "Request not found.",
  "All approval steps are already completed.",
  "この申請は他のユーザーによって更新されました。画面を更新してください",
  "この承認ステップの期限が切れています",
]);

function sanitizeApprovalReason(reason: string): string {
  if (KNOWN_APPROVAL_REASONS.has(reason)) return reason;
  if (reason.startsWith("Cannot transition")) return reason;
  if (reason.startsWith("Unauthorized:")) return reason;
  return "操作を完了できませんでした";
}

const listSchema = z.object({
  operation: z.literal("list"),
  filter: z.enum(["action_required", "my_requests", "all"]).optional(),
  statusFilter: z
    .enum(["draft", "pending", "approved", "rejected", "revision", "expired"])
    .optional(),
});

const getSchema = z.object({
  operation: z.literal("get"),
  requestId: z.string().uuid(),
});

const createSchema = z.object({
  operation: z.literal("create"),
  title: z.string().min(1, "タイトルは必須です"),
  templateId: z.string().uuid(),
  formData: z.record(z.string(), z.unknown()).optional(),
});

const submitSchema = z.object({
  operation: z.literal("submit"),
  requestId: z.string().uuid(),
});

const approveSchema = z.object({
  operation: z.literal("approve"),
  requestId: z.string().uuid(),
});

const rejectSchema = z.object({
  operation: z.literal("reject"),
  requestId: z.string().uuid(),
  targetStatus: z.enum(["rejected", "revision"]).optional(),
  comment: z.string().optional(),
});

const bulkApproveSchema = z.object({
  operation: z.literal("bulk_approve"),
  requestIds: z.array(z.string().uuid()).min(1).max(20),
});

const resubmitSchema = z.object({
  operation: z.literal("resubmit"),
  requestId: z.string().uuid(),
});

const approvalRequestsInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  getSchema,
  createSchema,
  submitSchema,
  approveSchema,
  rejectSchema,
  bulkApproveSchema,
  resubmitSchema,
]);

export function registerApprovalRequestsTools(server: McpServer): void {
  server.registerTool(
    "approval_requests",
    {
      description:
        "承認リクエストの一覧取得・詳細取得・作成・提出・承認・却下・一括承認・再提出を行います。operation 引数で操作を切り替えます。" +
        "【filter 引数の注意】admin/manager は全件、それ以外のロールは自分の申請のみ返します（filter 未指定時）。filter=all を明示指定した場合は admin/manager のみ全件返し、それ以外は空配列を返します。",
      inputSchema: approvalRequestsInputSchema,
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
            if (!canPerform(role, "approval", "listRequests")) {
              return toToolError("権限がありません");
            }
            const allRequests = await listRequests(organizationId);

            let filtered = allRequests;

            if (args.filter === "action_required") {
              filtered = filtered.filter((req) => {
                if (req.status !== "pending") return false;
                // Legacy: ステップなしの場合は action_required に含める
                if (req.approvalSteps.length === 0) return true;
                // ステップあり: 現在ユーザーのロールに該当する pending ステップがある場合
                return req.approvalSteps.some(
                  (step) => step.approverRole === role && step.status === "pending"
                );
              });
            } else if (args.filter === "my_requests") {
              filtered = filtered.filter((req) => req.creatorId === userId);
            } else if (args.filter === "all") {
              // admin/manager 以外は空配列
              if (role !== "admin" && role !== "manager") {
                filtered = [];
              }
            } else {
              // filter 未指定: admin/manager は全件。それ以外は自分の申請のみに制限し、
              // 組織全件の越権閲覧を防ぐ（filter=all の制限と同じ意図）。
              if (role !== "admin" && role !== "manager") {
                filtered = filtered.filter((req) => req.creatorId === userId);
              }
            }

            if (args.statusFilter) {
              const statusFilter = args.statusFilter;
              filtered = filtered.filter((req) => req.status === statusFilter);
            }

            return toToolSuccess(filtered);
          }

          case "get": {
            if (!canPerform(role, "approval", "viewRequest")) {
              return toToolError("権限がありません");
            }
            const request = await getRequest(args.requestId, organizationId);
            if (!request) {
              return toToolError("承認リクエストが見つかりません");
            }
            const steps = await getApprovalSteps({
              requestId: args.requestId,
              organizationId,
            });
            return toToolSuccess({ ...request, approvalSteps: steps });
          }

          case "create": {
            if (!canPerform(role, "approval", "listRequests")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createRequest:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const template = await approvalTemplateRepository.findById(
              args.templateId,
              organizationId
            );
            if (!template) {
              return toToolError("テンプレートが見つかりません");
            }

            // テンプレートフィールド定義に基づいて formData を検証・変換する
            const inputFormData = args.formData ?? {};
            const builtFormData: Record<string, { value: unknown; label: string }> = {};
            const formErrors: string[] = [];

            for (const field of template.fields) {
              const rawValue = inputFormData[field.name];
              const strValue =
                rawValue !== null && rawValue !== undefined ? String(rawValue).trim() : "";

              if (field.required && strValue === "") {
                formErrors.push(`${field.label}は必須です`);
                continue;
              }

              if (strValue === "") continue;

              if (field.type === "number") {
                const numValue = Number(strValue);
                if (!isFinite(numValue)) {
                  formErrors.push(`${field.label}は数値を入力してください`);
                  continue;
                }
                builtFormData[field.name] = { value: numValue, label: field.label };
              } else if (field.type === "select") {
                const options = field.options ?? [];
                if (!options.includes(strValue)) {
                  formErrors.push(`${field.label}の値が不正です`);
                  continue;
                }
                builtFormData[field.name] = { value: strValue, label: field.label };
              } else {
                builtFormData[field.name] = { value: strValue, label: field.label };
              }
            }

            if (formErrors.length > 0) {
              return toToolError(formErrors.join(", "));
            }

            const result = await createRequest({
              title: args.title,
              templateId: args.templateId,
              formData: builtFormData,
              organizationId,
              creatorId: userId,
            });

            if (!result.ok) {
              return toToolError(result.reason);
            }
            return toToolSuccess(result.request);
          }

          case "submit": {
            if (!canPerform(role, "approval", "submit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:submitRequest:${userId}`,
              limit: RATE_LIMITS.approveReject.limit,
              windowMs: RATE_LIMITS.approveReject.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await submitRequest({
              requestId: args.requestId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(sanitizeApprovalReason(result.reason));
            }
            return toToolSuccess(result.request);
          }

          case "approve": {
            if (!canPerform(role, "approval", "approve")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:approveRequest:${userId}`,
              limit: RATE_LIMITS.approveReject.limit,
              windowMs: RATE_LIMITS.approveReject.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await approveRequest({
              requestId: args.requestId,
              organizationId,
              actorId: userId,
              actorRole: role,
            });

            if (!result.ok) {
              return toToolError(sanitizeApprovalReason(result.reason));
            }
            return toToolSuccess(result.request);
          }

          case "reject": {
            if (!canPerform(role, "approval", "reject")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:rejectRequest:${userId}`,
              limit: RATE_LIMITS.approveReject.limit,
              windowMs: RATE_LIMITS.approveReject.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await rejectRequest({
              requestId: args.requestId,
              organizationId,
              actorId: userId,
              targetStatus: args.targetStatus ?? "rejected",
              comment: args.comment,
            });

            if (!result.ok) {
              return toToolError(sanitizeApprovalReason(result.reason));
            }
            return toToolSuccess(result.request);
          }

          case "bulk_approve": {
            if (!canPerform(role, "approval", "approve")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:bulkApprove:${userId}`,
              limit: RATE_LIMITS.approveReject.limit,
              windowMs: RATE_LIMITS.approveReject.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await bulkApprove({
              requestIds: args.requestIds,
              actorId: userId,
              actorRole: role,
              organizationId,
            });

            // per-item reason も単発 approve と同様に sanitize する（DB エラー文の漏洩防止）
            const sanitized = {
              results: result.results.map((r) =>
                r.reason === undefined
                  ? r
                  : { ...r, reason: sanitizeApprovalReason(r.reason) }
              ),
            };
            return toToolSuccess(sanitized);
          }

          case "resubmit": {
            if (!canPerform(role, "approval", "submit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:resubmitRequest:${userId}`,
              limit: RATE_LIMITS.approveReject.limit,
              windowMs: RATE_LIMITS.approveReject.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await resubmitRequest({
              requestId: args.requestId,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError(sanitizeApprovalReason(result.reason));
            }
            return toToolSuccess(result.request);
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
