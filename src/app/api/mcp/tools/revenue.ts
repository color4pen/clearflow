import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { getRevenueDashboard } from "@/application/usecases/getRevenueDashboard";
import { getRevenueDetails } from "@/application/usecases/getRevenueDetails";
import { getRevenueForecast } from "@/application/usecases/getRevenueForecast";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import type { Role } from "@/domain/models/user";
import type { RevenueAxis } from "@/application/usecases/getRevenueDetails";

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

/**
 * 終端日を当日末（23:59:59.999Z）に補正する。人間の売上画面と同じ inclusive 集計にするため
 * （リポジトリのフィルタは `lte(paidAt, endDate)`。日付のみ指定では当日中の入金が除外されてしまう）。
 */
function toEndOfDay(s: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T23:59:59.999Z`) : new Date(s);
}

const dashboardSchema = z.object({
  operation: z.literal("dashboard"),
});

const detailsSchema = z.object({
  operation: z.literal("details"),
  startDate: dateString,
  endDate: dateString,
  axis: z.enum(["monthly", "customer", "deal"]),
});

const forecastSchema = z.object({
  operation: z.literal("forecast"),
  periodStart: dateString,
  periodEnd: dateString,
});

const revenueInputSchema = z.discriminatedUnion("operation", [
  dashboardSchema,
  detailsSchema,
  forecastSchema,
]);

export function registerRevenueTools(server: McpServer): void {
  server.registerTool(
    "revenue",
    {
      description:
        "売上（Revenue）のダッシュボード・明細・予実取得を行います（読み取り専用）。operation 引数で操作を切り替えます。",
      inputSchema: revenueInputSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { organizationId, role } = auth;

        switch (args.operation) {
          case "dashboard": {
            if (!canPerform(role, "revenue", "view")) {
              return toToolError("権限がありません");
            }
            const dashboard = await getRevenueDashboard({ organizationId });
            return toToolSuccess(dashboard);
          }

          case "details": {
            if (!canPerform(role, "revenue", "view")) {
              return toToolError("権限がありません");
            }
            const details = await getRevenueDetails({
              organizationId,
              startDate: new Date(args.startDate),
              endDate: toEndOfDay(args.endDate),
              axis: args.axis as RevenueAxis,
            });
            return toToolSuccess(details);
          }

          case "forecast": {
            if (!canPerform(role, "revenue", "view")) {
              return toToolError("権限がありません");
            }
            const forecast = await getRevenueForecast({
              organizationId,
              periodStart: new Date(args.periodStart),
              periodEnd: toEndOfDay(args.periodEnd),
            });
            return toToolSuccess(forecast);
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
