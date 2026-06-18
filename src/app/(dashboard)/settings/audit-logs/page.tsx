import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { auditLogRepository } from "@/infrastructure/repositories";
import { BTN_PRIMARY, INPUT_BASE, SELECT_BASE } from "../../styles";

const LIMIT = 50;

const ACTION_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "request.create", label: "request.create" },
  { value: "request.submit", label: "request.submit" },
  { value: "request.approve", label: "request.approve" },
  { value: "request.reject", label: "request.reject" },
  { value: "request.resubmit", label: "request.resubmit" },
  { value: "step.approve", label: "step.approve" },
  { value: "step.reject", label: "step.reject" },
];

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  const params = await searchParams;

  const startDateStr = typeof params.startDate === "string" ? params.startDate : undefined;
  const endDateStr = typeof params.endDate === "string" ? params.endDate : undefined;
  const actionStr = typeof params.action === "string" ? params.action : undefined;
  const pageStr = typeof params.page === "string" ? params.page : undefined;

  const page = Math.max(1, parseInt(pageStr ?? "1", 10) || 1);
  const offset = (page - 1) * LIMIT;

  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (startDateStr) {
    const d = new Date(startDateStr);
    if (!isNaN(d.getTime())) startDate = d;
  }
  if (endDateStr) {
    const d = new Date(endDateStr);
    if (!isNaN(d.getTime())) endDate = d;
  }

  const action = actionStr || undefined;

  const logs = await auditLogRepository.findByOrganization(session.user.organizationId, {
    limit: LIMIT,
    offset,
    startDate,
    endDate,
    action,
  });

  // Build export URL with current filter conditions
  const exportParams = new URLSearchParams();
  if (startDateStr) exportParams.set("startDate", startDateStr);
  if (endDateStr) exportParams.set("endDate", endDateStr);
  if (actionStr) exportParams.set("action", actionStr);
  const exportUrl = `/api/audit-logs/export${exportParams.toString() ? "?" + exportParams.toString() : ""}`;

  // Build pagination links
  const filterParams = new URLSearchParams();
  if (startDateStr) filterParams.set("startDate", startDateStr);
  if (endDateStr) filterParams.set("endDate", endDateStr);
  if (actionStr) filterParams.set("action", actionStr);

  const prevFilterParams = new URLSearchParams(filterParams);
  prevFilterParams.set("page", String(page - 1));

  const nextFilterParams = new URLSearchParams(filterParams);
  nextFilterParams.set("page", String(page + 1));

  const hasNext = logs.length === LIMIT;

  return (
    <div>
      {/* Toolbar */}
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0 flex items-center justify-between">
        <span className="text-sm font-bold text-[#333333]">監査ログ</span>
        <a
          href={exportUrl}
          download
          className="text-xs text-primary underline"
        >
          CSV ダウンロード
        </a>
      </div>

      {/* フィルタ */}
      <form method="get" className="bg-bg-toolbar border border-border border-t-0 px-2 py-1 mb-0">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 items-end">
          <div>
            <label htmlFor="startDate" className="block text-xs font-bold text-text mb-1">
              開始日
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              defaultValue={startDateStr ?? ""}
              className={INPUT_BASE}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-xs font-bold text-text mb-1">
              終了日
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              defaultValue={endDateStr ?? ""}
              className={INPUT_BASE}
            />
          </div>
          <div>
            <label htmlFor="action" className="block text-xs font-bold text-text mb-1">
              アクション種別
            </label>
            <select
              id="action"
              name="action"
              defaultValue={actionStr ?? ""}
              className={SELECT_BASE}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-1">
          <button
            type="submit"
            className={BTN_PRIMARY}
          >
            フィルタ
          </button>
        </div>
      </form>

      {/* テーブル */}
      <div className="bg-bg-surface border border-border-light border-t-0">
        {logs.length === 0 ? (
          <div className="text-center py-4 text-xs text-text-disabled">
            監査ログはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-bg-table-head border border-border-table-head">
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">日時</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">アクション</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">対象種別</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">対象 ID</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">実行者 ID</th>
                  <th className="px-1 py-1.5 text-xs text-text font-bold text-left">メタデータ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`border border-border-light hover:bg-[#eef2f7] ${index % 2 === 0 ? "bg-bg-surface" : "bg-bg-surface-alt"}`}
                  >
                    <td className="px-1 py-1 text-xs text-text-muted whitespace-nowrap">
                      {log.createdAt.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-1 py-1 text-xs text-text">{log.action}</td>
                    <td className="px-1 py-1 text-xs text-text">{log.targetType}</td>
                    <td className="px-1 py-1 text-xs text-text">
                      {log.targetId}
                    </td>
                    <td className="px-1 py-1 text-xs text-text">
                      {log.actorId}
                    </td>
                    <td className="px-1 py-1 text-xs text-text-muted max-w-xs truncate">
                      {JSON.stringify(log.metadata ?? {}).slice(0, 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ページネーション */}
      <div className="flex items-center justify-between mt-2">
        <div>
          {page > 1 && (
            <a
              href={`/settings/audit-logs?${prevFilterParams.toString()}`}
              className="text-xs text-primary underline"
            >
              ← 前へ
            </a>
          )}
        </div>
        <div className="text-xs text-text-muted">ページ {page}</div>
        <div>
          {hasNext && (
            <a
              href={`/settings/audit-logs?${nextFilterParams.toString()}`}
              className="text-xs text-primary underline"
            >
              次へ →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
