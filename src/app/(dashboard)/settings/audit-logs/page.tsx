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
      <div className="bg-[#f5f5f5] border border-[#cccccc] px-2 py-1 mb-0 flex items-center justify-between">
        <span className="text-sm font-bold text-[#333333]">監査ログ</span>
        <a
          href={exportUrl}
          download
          className="text-xs text-[#2980b9] underline"
        >
          CSV ダウンロード
        </a>
      </div>

      {/* フィルタ */}
      <form method="get" className="bg-[#f5f5f5] border border-[#cccccc] border-t-0 px-2 py-1 mb-0">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 items-end">
          <div>
            <label htmlFor="startDate" className="block text-xs font-bold text-[#2c3e50] mb-1">
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
            <label htmlFor="endDate" className="block text-xs font-bold text-[#2c3e50] mb-1">
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
            <label htmlFor="action" className="block text-xs font-bold text-[#2c3e50] mb-1">
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
      <div className="bg-white border border-[#e0e0e0] border-t-0">
        {logs.length === 0 ? (
          <div className="text-center py-4 text-xs text-[#95a5a6]">
            監査ログはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#dcdde1] border border-[#bdc3c7]">
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">日時</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">アクション</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">対象種別</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">対象 ID</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">実行者 ID</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">メタデータ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`border border-[#e0e0e0] hover:bg-[#eef2f7] ${index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}`}
                  >
                    <td className="px-1 py-1 text-xs text-[#7f8c8d] whitespace-nowrap">
                      {log.createdAt.toLocaleString("ja-JP")}
                    </td>
                    <td className="px-1 py-1 text-xs text-[#2c3e50]">{log.action}</td>
                    <td className="px-1 py-1 text-xs text-[#2c3e50]">{log.targetType}</td>
                    <td className="px-1 py-1 text-xs text-[#2c3e50]">
                      {log.targetId}
                    </td>
                    <td className="px-1 py-1 text-xs text-[#2c3e50]">
                      {log.actorId}
                    </td>
                    <td className="px-1 py-1 text-xs text-[#7f8c8d] max-w-xs truncate">
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
              className="text-xs text-[#2980b9] underline"
            >
              ← 前へ
            </a>
          )}
        </div>
        <div className="text-xs text-[#7f8c8d]">ページ {page}</div>
        <div>
          {hasNext && (
            <a
              href={`/settings/audit-logs?${nextFilterParams.toString()}`}
              className="text-xs text-[#2980b9] underline"
            >
              次へ →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
