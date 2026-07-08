import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import { canPerform } from "@/domain/authorization";
import { getRevenueDashboard } from "@/application/usecases/getRevenueDashboard";
import { getRevenueDetails } from "@/application/usecases/getRevenueDetails";
import { getRevenueForecast } from "@/application/usecases/getRevenueForecast";
import { toToolError, toToolSuccess, handleToolError } from "../errors";
import { buildAdvertisementSchema, validateAndParse } from "../schemaHelpers";
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
  startDate: dateString.describe("集計開始日"),
  endDate: dateString.describe("集計終了日"),
  axis: z.enum(["monthly", "customer", "deal"]).describe("monthly=月次, customer=顧客別, deal=案件別"),
});

const forecastSchema = z.object({
  operation: z.literal("forecast"),
  periodStart: dateString.describe("予実開始日"),
  periodEnd: dateString.describe("予実終了日"),
});

const revenueInputSchema = z.discriminatedUnion("operation", [
  dashboardSchema,
  detailsSchema,
  forecastSchema,
]);

const revenueAdvertisementSchema = buildAdvertisementSchema([
  dashboardSchema,
  detailsSchema,
  forecastSchema,
]);

export function registerRevenueTools(server: McpServer): void {
  server.registerTool(
    "revenue",
    {
      description:
        "売上情報。売上（Revenue）・売上実績（sales）のダッシュボード・期間別明細・予実（forecast）を取得する（読み取り専用）。operation: dashboard/details/forecast",
      inputSchema: revenueAdvertisementSchema,
    },
    async (args, extra) => {
      try {
        const auth = getAuthInfo(extra);
        if (!auth) {
          return toToolError("認証情報が取得できません");
        }
        const { organizationId, role } = auth;

        const parseResult = validateAndParse(revenueInputSchema, args);
        if (parseResult) return parseResult;
        const typedArgs = args as z.infer<typeof revenueInputSchema>;

        switch (typedArgs.operation) {
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
              startDate: new Date(typedArgs.startDate),
              endDate: toEndOfDay(typedArgs.endDate),
              axis: typedArgs.axis as RevenueAxis,
            });
            return toToolSuccess(details);
          }

          case "forecast": {
            if (!canPerform(role, "revenue", "view")) {
              return toToolError("権限がありません");
            }
            const forecast = await getRevenueForecast({
              organizationId,
              periodStart: new Date(typedArgs.periodStart),
              periodEnd: toEndOfDay(typedArgs.periodEnd),
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
