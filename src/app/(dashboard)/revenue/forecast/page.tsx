import { auth } from "@/infrastructure/auth";
import { getRevenueForecast } from "@/application/usecases";
import { PageToolbar, SectionCard, MoneyInput } from "@/app/components";
import { canPerform } from "@/domain/authorization";
import {
  setRevenueTargetAction,
  deleteRevenueTargetAction,
} from "@/app/actions/revenue";

function getDefaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1); // 当年1月1日
  const end = new Date(now.getFullYear(), 11, 31); // 当年12月31日
  return {
    periodStart: start,
    periodEnd: end,
  };
}

export default async function RevenueForecastPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const userRole = session!.user.role;

  const canSetTarget = canPerform(userRole, "revenue", "setTarget");

  const { periodStart, periodEnd } = getDefaultPeriod();

  const forecast = await getRevenueForecast({
    organizationId,
    periodStart,
    periodEnd,
  });

  return (
    <div>
      <PageToolbar title="予実管理" />

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
                          className="text-xs text-red-500 hover:underline"
                        >
                          削除
                        </button>
                      </form>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-text-muted text-xs">目標金額</span>
                      <p className="font-semibold">¥{item.target.targetAmount.toLocaleString("ja-JP")}</p>
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
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${Math.min(item.progressRate * 100, 100)}%`,
                          }}
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
