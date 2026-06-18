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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">監査ログ</h1>
          <p className="mt-1 text-sm text-gray-500">組織の操作履歴を表示します。</p>
        </div>
        <a
          href={exportUrl}
          download
          className={`inline-flex items-center ${BTN_PRIMARY}`}
        >
          CSV ダウンロード
        </a>
      </div>

      {/* フィルタ */}
      <form method="get" className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
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
            <label htmlFor="action" className="block text-sm font-medium text-gray-700 mb-1">
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
        <div className="flex justify-end">
          <button
            type="submit"
            className={BTN_PRIMARY}
          >
            フィルタ
          </button>
        </div>
      </form>

      {/* テーブル */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        {logs.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            監査ログはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-3">日時</th>
                  <th className="px-6 py-3">アクション</th>
                  <th className="px-6 py-3">対象種別</th>
                  <th className="px-6 py-3">対象 ID</th>
                  <th className="px-6 py-3">実行者 ID</th>
                  <th className="px-6 py-3">メタデータ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {log.createdAt.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{log.action}</td>
                    <td className="px-6 py-4 text-gray-600">{log.targetType}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      {log.targetId}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                      {log.actorId}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
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
      <div className="flex items-center justify-between">
        <div>
          {page > 1 && (
            <a
              href={`/settings/audit-logs?${prevFilterParams.toString()}`}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← 前へ
            </a>
          )}
        </div>
        <div className="text-sm text-gray-500">ページ {page}</div>
        <div>
          {hasNext && (
            <a
              href={`/settings/audit-logs?${nextFilterParams.toString()}`}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              次へ →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
