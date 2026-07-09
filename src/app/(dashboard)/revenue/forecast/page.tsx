import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { getRevenueForecast } from "@/application/usecases";
import { PageToolbar, SectionCard, MoneyInput } from "@/app/components";
import { canPerform } from "@/domain/authorization";
import {
  setRevenueTargetAction,
  deleteRevenueTargetAction,
  updateRevenueTargetAction,
} from "@/app/actions/revenue";

type PeriodType = "monthly" | "quarterly" | "yearly";

function isValidPeriodType(value: string | null): value is PeriodType {
  return value === "monthly" || value === "quarterly" || value === "yearly";
}

function getPeriodBounds(periodType: PeriodType): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  if (periodType === "monthly") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { periodStart: start, periodEnd: end };
  }

  if (periodType === "quarterly") {
    const quarterIndex = Math.floor(month / 3); // 0-3
    const quarterStartMonth = quarterIndex * 3; // 0, 3, 6, 9
    const quarterEndMonth = quarterStartMonth + 2;
    const start = new Date(year, quarterStartMonth, 1);
    const end = new Date(year, quarterEndMonth + 1, 0, 23, 59, 59, 999);
    return { periodStart: start, periodEnd: end };
  }

  // yearly
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { periodStart: start, periodEnd: end };
}

function getPrevNextLinks(periodType: PeriodType, periodStart: Date): { prevHref: string; nextHref: string } {
  const year = periodStart.getFullYear();
  const month = periodStart.getMonth();

  if (periodType === "monthly") {
    const prevDate = new Date(year, month - 1, 1);
    const nextDate = new Date(year, month + 1, 1);
    const prevStart = prevDate.toISOString().slice(0, 10);
    const prevEnd = new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 0).toISOString().slice(0, 10);
    const nextStart = nextDate.toISOString().slice(0, 10);
    const nextEnd = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).toISOString().slice(0, 10);
    return {
      prevHref: `/revenue/forecast?periodType=monthly&periodStart=${prevStart}&periodEnd=${prevEnd}`,
      nextHref: `/revenue/forecast?periodType=monthly&periodStart=${nextStart}&periodEnd=${nextEnd}`,
    };
  }

  if (periodType === "quarterly") {
    const quarterIndex = Math.floor(month / 3);
    const prevQStart = new Date(year, (quarterIndex - 1) * 3, 1);
    const prevQEnd = new Date(year, (quarterIndex - 1) * 3 + 3, 0);
    const nextQStart = new Date(year, (quarterIndex + 1) * 3, 1);
    const nextQEnd = new Date(year, (quarterIndex + 1) * 3 + 3, 0);
    return {
      prevHref: `/revenue/forecast?periodType=quarterly&periodStart=${prevQStart.toISOString().slice(0, 10)}&periodEnd=${prevQEnd.toISOString().slice(0, 10)}`,
      nextHref: `/revenue/forecast?periodType=quarterly&periodStart=${nextQStart.toISOString().slice(0, 10)}&periodEnd=${nextQEnd.toISOString().slice(0, 10)}`,
    };
  }

  // yearly
  const prevYearStart = `${year - 1}-01-01`;
  const prevYearEnd = `${year - 1}-12-31`;
  const nextYearStart = `${year + 1}-01-01`;
  const nextYearEnd = `${year + 1}-12-31`;
  return {
    prevHref: `/revenue/forecast?periodType=yearly&periodStart=${prevYearStart}&periodEnd=${prevYearEnd}`,
    nextHref: `/revenue/forecast?periodType=yearly&periodStart=${nextYearStart}&periodEnd=${nextYearEnd}`,
  };
}

const periodTypeLabels: Record<PeriodType, string> = {
  monthly: "月次",
  quarterly: "四半期",
  yearly: "年次",
};

export default async function RevenueForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ periodType?: string; periodStart?: string; periodEnd?: string }>;
}) {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const userRole = session!.user.role;

  const canSetTarget = canPerform(userRole, "revenue", "setTarget");

  const params = await searchParams;
  const periodType: PeriodType = isValidPeriodType(params.periodType ?? null)
    ? (params.periodType as PeriodType)
    : "yearly";

  // searchParams で指定された期間があればそれを使う。なければ periodType から算出
  let periodStart: Date;
  let periodEnd: Date;
  if (params.periodStart && params.periodEnd) {
    periodStart = new Date(params.periodStart);
    periodEnd = new Date(params.periodEnd + "T23:59:59.999Z");
  } else {
    const bounds = getPeriodBounds(periodType);
    periodStart = bounds.periodStart;
    periodEnd = bounds.periodEnd;
  }

  const forecast = await getRevenueForecast({
    organizationId,
    periodStart,
    periodEnd,
  });

  const { prevHref, nextHref } = getPrevNextLinks(periodType, periodStart);

  return (
    <div>
      <PageToolbar title="予実管理" />

      {/* 期間種別タブ + 前後ナビ */}
      <div className="mt-2 flex items-center gap-2">
        <Link href={prevHref} className="px-2 py-1 text-sm text-text-muted hover:text-text border rounded">
          ‹
        </Link>
        {(Object.entries(periodTypeLabels) as [PeriodType, string][]).map(([key, label]) => (
          <Link
            key={key}
            href={`/revenue/forecast?periodType=${key}`}
            className={
              periodType === key
                ? "bg-primary text-white rounded px-3 py-1 text-sm font-medium"
                : "text-text-muted px-3 py-1 text-sm hover:text-text"
            }
          >
            {label}
          </Link>
        ))}
        <Link href={nextHref} className="px-2 py-1 text-sm text-text-muted hover:text-text border rounded">
          ›
        </Link>
      </div>

      {canSetTarget && (
        <SectionCard className="p-4 mt-2">
          <h2 className="text-sm font-semibold text-text-muted mb-3">売上目標の設定</h2>
          <form
            action={async (formData: FormData) => {
              "use server";
              await setRevenueTargetAction(formData);
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-xs text-text-muted mb-1">開始日</label>
              <input
                type="date"
                name="periodStart"
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">終了日</label>
              <input
                type="date"
                name="periodEnd"
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">目標金額</label>
              <MoneyInput name="targetAmount" />
            </div>
            <button
              type="submit"
              className="px-3 py-1 bg-primary text-white rounded text-sm hover:opacity-90"
            >
              設定する
            </button>
          </form>
        </SectionCard>
      )}

      <SectionCard className="p-4 mt-2">
        <h2 className="text-sm font-semibold text-text-muted mb-3">目標・実績・着地予測</h2>
        <p className="text-xs text-text-muted mb-2">
          パイプライン見込み合計: ¥{forecast.pipelineTotal.toLocaleString("ja-JP")}
        </p>

        {forecast.items.length === 0 ? (
          <p className="text-xs text-text-muted py-4 text-center">
            売上目標が設定されていません
          </p>
        ) : (
          <div className="space-y-4">
            {forecast.items.map((item) => {
              const targetId = item.target.id;
              const progressRate = item.progressRate;
              const pipelineRate =
                item.target.targetAmount > 0
                  ? item.landingForecast / item.target.targetAmount
                  : 0;
              const progressWidth = `${Math.min(progressRate * 100, 100)}%`;
              const pipelineSegmentWidth = `${Math.max(
                0,
                Math.min((pipelineRate - progressRate) * 100, 100 - progressRate * 100)
              )}%`;

              return (
                <div key={item.target.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">
                        {item.target.periodStart.toLocaleDateString("ja-JP")} 〜{" "}
                        {item.target.periodEnd.toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    {canSetTarget && (
                      <form
                        action={async () => {
                          "use server";
                          await deleteRevenueTargetAction(targetId);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-xs text-danger hover:underline"
                        >
                          削除
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-text-muted text-xs">目標金額</span>
                      {canSetTarget ? (
                        <form
                          action={async (formData: FormData) => {
                            "use server";
                            await updateRevenueTargetAction(formData);
                          }}
                          className="flex items-center gap-2 mt-0.5"
                        >
                          <input type="hidden" name="id" value={targetId} />
                          <MoneyInput
                            name="targetAmount"
                            defaultValue={item.target.targetAmount}
                          />
                          <button
                            type="submit"
                            className="text-xs text-primary underline"
                          >
                            保存
                          </button>
                        </form>
                      ) : (
                        <p className="font-semibold">¥{item.target.targetAmount.toLocaleString("ja-JP")}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-text-muted text-xs">実績金額</span>
                      <p className="font-semibold">¥{item.actualAmount.toLocaleString("ja-JP")}</p>
                    </div>
                    <div>
                      <span className="text-text-muted text-xs">進捗率</span>
                      <p className="font-semibold">{(item.progressRate * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-text-muted text-xs">着地予測</span>
                      <p className="font-semibold">¥{item.landingForecast.toLocaleString("ja-JP")}</p>
                    </div>
                  </div>
                  {item.target.targetAmount > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-border rounded-full h-2 flex overflow-hidden">
                        <div
                          className="bg-primary h-2"
                          style={{ width: progressWidth }}
                        />
                        <div
                          className="bg-primary/30 h-2"
                          style={{ width: pipelineSegmentWidth }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
