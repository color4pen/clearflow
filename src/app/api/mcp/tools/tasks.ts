import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { checkRateLimit, RATE_LIMITS } from "@/infrastructure/rateLimit";
import { listActionItems } from "@/application/usecases/listActionItems";
import { createActionItem } from "@/application/usecases/createActionItem";
import { updateActionItem } from "@/application/usecases/updateActionItem";
import { updateActionItemStatus } from "@/application/usecases/updateActionItemStatus";
import { toggleActionItemDone } from "@/application/usecases/toggleActionItemDone";
import { deleteActionItem } from "@/application/usecases/deleteActionItem";
import { searchDeals } from "@/application/usecases/searchDeals";
import { searchInquiries } from "@/application/usecases/searchInquiries";
import { searchMeetings } from "@/application/usecases/searchMeetings";
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
  done: z.boolean().optional(),
  assigneeId: z.string().uuid().optional(),
});

const createSchema = z.object({
  operation: z.literal("create"),
  description: z.string().min(1, "説明は必須です"),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  interactionId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  inquiryId: z.string().uuid().optional(),
});

const updateSchema = z.object({
  operation: z.literal("update"),
  id: z.string().uuid("アクションアイテムIDが不正です"),
  description: z.string().min(1).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  interactionId: z.string().uuid().nullable().optional(),
  dealId: z.string().uuid().nullable().optional(),
  inquiryId: z.string().uuid().nullable().optional(),
});

const updateStatusSchema = z.object({
  operation: z.literal("update_status"),
  id: z.string().uuid("アクションアイテムIDが不正です"),
  status: z.enum(["todo", "in_progress", "done"]),
});

const toggleSchema = z.object({
  operation: z.literal("toggle"),
  id: z.string().uuid("アクションアイテムIDが不正です"),
});

const deleteSchema = z.object({
  operation: z.literal("delete"),
  id: z.string().uuid("アクションアイテムIDが不正です"),
});

const searchLinkTargetsSchema = z.object({
  operation: z.literal("search_link_targets"),
  type: z.enum(["deal", "inquiry", "meeting"]),
  query: z.string(),
});

const tasksInputSchema = z.discriminatedUnion("operation", [
  listSchema,
  createSchema,
  updateSchema,
  updateStatusSchema,
  toggleSchema,
  deleteSchema,
  searchLinkTargetsSchema,
]);

export function registerTasksTools(server: McpServer): void {
  server.registerTool(
    "tasks",
    {
      description:
        "アクションアイテム（タスク）の一覧取得・作成・更新・ステータス更新・トグル・削除・リンク先候補検索を行います。operation 引数で操作を切り替えます。",
      inputSchema: tasksInputSchema,
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
            if (!canPerform(role, "actionItem", "list")) {
              return toToolError("権限がありません");
            }
            const items = await listActionItems({
              organizationId,
              done: args.done,
              assigneeId: args.assigneeId,
            });
            return toToolSuccess(items);
          }

          case "create": {
            if (!canPerform(role, "actionItem", "create")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:createActionItem:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await createActionItem({
              organizationId,
              actorId: userId,
              description: args.description,
              assigneeId: args.assigneeId ?? null,
              dueDate: args.dueDate ? new Date(args.dueDate) : null,
              interactionId: args.interactionId ?? null,
              dealId: args.dealId ?? null,
              inquiryId: args.inquiryId ?? null,
            });

            if (!result.ok) {
              return toToolError("タスクの作成に失敗しました");
            }
            return toToolSuccess(result.actionItem);
          }

          case "update": {
            if (!canPerform(role, "actionItem", "edit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateActionItem:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            // dueDate: undefined（変更なし）と null（クリア）を区別する
            const dueDate =
              args.dueDate === undefined
                ? undefined
                : args.dueDate === null
                  ? null
                  : new Date(args.dueDate);

            const result = await updateActionItem({
              id: args.id,
              organizationId,
              actorId: userId,
              description: args.description,
              assigneeId: args.assigneeId,
              dueDate,
              interactionId: args.interactionId,
              dealId: args.dealId,
              inquiryId: args.inquiryId,
            });

            if (!result.ok) {
              return toToolError("タスクの更新に失敗しました");
            }
            return toToolSuccess(result.actionItem);
          }

          case "update_status": {
            if (!canPerform(role, "actionItem", "edit")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:updateActionItemStatus:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await updateActionItemStatus({
              id: args.id,
              organizationId,
              actorId: userId,
              status: args.status,
            });

            if (!result.ok) {
              return toToolError("タスクのステータス更新に失敗しました");
            }
            return toToolSuccess(result.actionItem);
          }

          case "toggle": {
            if (!canPerform(role, "actionItem", "toggle")) {
              return toToolError("権限がありません");
            }

            const result = await toggleActionItemDone({
              id: args.id,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError("タスクのトグルに失敗しました");
            }
            return toToolSuccess(result.actionItem);
          }

          case "delete": {
            if (!canPerform(role, "actionItem", "delete")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:deleteActionItem:${userId}`,
              limit: RATE_LIMITS.createRequest.limit,
              windowMs: RATE_LIMITS.createRequest.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            const result = await deleteActionItem({
              id: args.id,
              organizationId,
              actorId: userId,
            });

            if (!result.ok) {
              return toToolError("タスクの削除に失敗しました");
            }
            return toToolSuccess({ deleted: true, id: args.id });
          }

          case "search_link_targets": {
            if (!canPerform(role, "actionItem", "create")) {
              return toToolError("権限がありません");
            }
            const rateCheck = await checkRateLimit({
              key: `mcp:searchLinkTargets:${userId}`,
              limit: RATE_LIMITS.search.limit,
              windowMs: RATE_LIMITS.search.windowMs,
            });
            if (!rateCheck.allowed) {
              return toToolError("レート制限超過。しばらく待ってから再試行してください");
            }

            let results;
            if (args.type === "deal") {
              results = await searchDeals(organizationId, args.query);
            } else if (args.type === "inquiry") {
              results = await searchInquiries(organizationId, args.query);
            } else {
              results = await searchMeetings(organizationId, args.query);
            }

            return toToolSuccess(results);
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
