import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { auditLogRepository } from "@/infrastructure/repositories";
import { listOrganizationUsers } from "@/application/usecases";
import { PageToolbar, DataTable, SectionCard, FormField, Input, Select } from "@/app/components";

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

const TARGET_TYPE_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "request", label: "request" },
  { value: "step", label: "step" },
  { value: "policy", label: "policy" },
  { value: "template", label: "template" },
  { value: "delegation", label: "delegation" },
  { value: "webhook", label: "webhook" },
  { value: "user", label: "user" },
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
  const actorIdStr = typeof params.actorId === "string" ? params.actorId : undefined;
  const targetTypeStr = typeof params.targetType === "string" ? params.targetType : undefined;
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
  const actorId = actorIdStr || undefined;
  const targetType = targetTypeStr || undefined;

  const [logs, orgUsers] = await Promise.all([
    auditLogRepository.findByOrganization(session.user.organizationId, {
      limit: LIMIT,
      offset,
      startDate,
      endDate,
      action,
      actorId,
      targetType,
    }),
    listOrganizationUsers({ organizationId: session.user.organizationId }),
  ]);

  const userNameMap = new Map(orgUsers.map((u) => [u.id, u.name]));

  // Build export URL with current filter conditions
  const exportParams = new URLSearchParams();
  if (startDateStr) exportParams.set("startDate", startDateStr);
  if (endDateStr) exportParams.set("endDate", endDateStr);
  if (actionStr) exportParams.set("action", actionStr);
  if (actorIdStr) exportParams.set("actorId", actorIdStr);
  if (targetTypeStr) exportParams.set("targetType", targetTypeStr);
  const exportUrl = `/api/audit-logs/export${exportParams.toString() ? "?" + exportParams.toString() : ""}`;

  // Build pagination links
  const filterParams = new URLSearchParams();
  if (startDateStr) filterParams.set("startDate", startDateStr);
  if (endDateStr) filterParams.set("endDate", endDateStr);
  if (actionStr) filterParams.set("action", actionStr);
  if (actorIdStr) filterParams.set("actorId", actorIdStr);
  if (targetTypeStr) filterParams.set("targetType", targetTypeStr);

  const prevFilterParams = new URLSearchParams(filterParams);
  prevFilterParams.set("page", String(page - 1));

  const nextFilterParams = new URLSearchParams(filterParams);
  nextFilterParams.set("page", String(page + 1));

  const hasNext = logs.length === LIMIT;

  return (
    <div>
      {/* Toolbar */}
      <PageToolbar
        title="監査ログ"
        actions={
          <a
            href={exportUrl}
            download
            className="text-xs text-primary underline"
          >
            CSV ダウンロード
          </a>
        }
      />

      {/* フィルタ */}
      <form method="get" className="bg-bg-toolbar border border-border border-t-0 px-2 py-1 mb-0">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 items-end">
          <FormField label="操作者" htmlFor="actorId">
            <Select
              id="actorId"
              name="actorId"
              defaultValue={actorIdStr ?? ""}
            >
              <option value="">すべて</option>
              {orgUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="操作種別" htmlFor="action">
            <Select
              id="action"
              name="action"
              defaultValue={actionStr ?? ""}
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="対象種別" htmlFor="targetType">
            <Select
              id="targetType"
              name="targetType"
              defaultValue={targetTypeStr ?? ""}
            >
              {TARGET_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-1">
            <FormField label="開始日" htmlFor="startDate">
              <Input
                type="date"
                id="startDate"
                name="startDate"
                defaultValue={startDateStr ?? ""}
              />
            </FormField>
            <FormField label="終了日" htmlFor="endDate">
              <Input
                type="date"
                id="endDate"
                name="endDate"
                defaultValue={endDateStr ?? ""}
              />
            </FormField>
          </div>
        </div>
        <div className="flex justify-end mt-1">
          <button
            type="submit"
            className="text-primary underline text-xs"
          >
            フィルタ
          </button>
        </div>
      </form>

      {/* テーブル */}
      <div className="border-t-0">
        {logs.length === 0 ? (
          <SectionCard className="border-t-0">
            <div className="text-center py-4 text-xs text-text-disabled">
              監査ログはありません。
            </div>
          </SectionCard>
        ) : (
          <DataTable
            columns={[
              {
                key: "createdAt",
                header: "日時",
                render: (log) => (
                  <span className="text-text-muted whitespace-nowrap">
                    {log.createdAt.toLocaleString("ja-JP")}
                  </span>
                ),
              },
              {
                key: "actorId",
                header: "操作者",
                render: (log) => (
                  <span className="text-text">{userNameMap.get(log.actorId) ?? log.actorId}</span>
                ),
              },
              {
                key: "action",
                header: "操作内容",
                render: (log) => <span className="text-text">{log.action}</span>,
              },
              {
                key: "targetType",
                header: "対象種別",
                render: (log) => <span className="text-text">{log.targetType}</span>,
              },
              {
                key: "targetId",
                header: "対象名",
                render: (log) => <span className="text-text">{log.targetId}</span>,
              },
            ]}
            rows={logs}
            rowKey={(log) => log.id}
          />
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
