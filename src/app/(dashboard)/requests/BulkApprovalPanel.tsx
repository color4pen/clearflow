"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DataTable } from "@/app/components";
import { StatusBadge } from "@/app/(dashboard)/components/StatusBadge";
import type { StatusBadgeVariant } from "@/app/(dashboard)/components/StatusBadge";
import type { BulkApproveActionResult } from "@/app/actions/requests";

type ApprovalStepItem = {
  approverRole: string;
  status: string;
  deadline?: Date | null;
};

type RequestItem = {
  id: string;
  title: string;
  status: string;
  statusText: string;
  statusVariant: StatusBadgeVariant;
  creatorId: string;
  creatorName: string;
  createdAt: Date;
  approvalSteps: ApprovalStepItem[];
  originType: string;
};

type Props = {
  requests: RequestItem[];
  bulkApproveAction: (requestIds: string[]) => Promise<BulkApproveActionResult>;
  showBulkApproval?: boolean;
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}/${m}/${d}`;
}

function OriginTypeLabel({ originType }: { originType: string }) {
  if (originType === "system") {
    return (
      <span className="text-xs bg-bg-toolbar text-text-muted border border-border rounded px-1.5 py-0.5">
        自動
      </span>
    );
  }
  return (
    <span className="text-xs text-text-disabled">
      手動
    </span>
  );
}

function isActionable(request: RequestItem): boolean {
  return (
    request.status === "pending" ||
    request.status === "revision" ||
    request.status === "draft"
  );
}

type BulkResult = BulkApproveActionResult["results"];

export function BulkApprovalPanel({
  requests,
  bulkApproveAction,
  showBulkApproval = true,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [resultType, setResultType] = useState<"success" | "partial" | "error">("success");

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleBulkApprove() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await bulkApproveAction(ids);
      setSelected(new Set());

      if (!result.success) {
        setResultType("error");
        setResultMessage(result.message ?? "エラーが発生しました");
        setBulkResult(null);
        return;
      }

      const results = result.results ?? [];
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      setBulkResult(results);

      if (failCount === 0) {
        setResultType("success");
        setResultMessage(`${successCount}件の承認が完了しました`);
      } else if (successCount === 0) {
        setResultType("error");
        setResultMessage(`全${failCount}件の承認に失敗しました`);
      } else {
        setResultType("partial");
        setResultMessage(`${successCount}件承認済み、${failCount}件失敗`);
      }
    });
  }

  function closeAlert() {
    setBulkResult(null);
    setResultMessage(null);
  }

  const selectedCount = selected.size;

  // Footer statistics
  const total = requests.length;
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  return (
    <div>
      {resultMessage && (
        <div
          className={`mb-4 p-4 border ${
            resultType === "success"
              ? "bg-bg-success-light border-border-success-light text-success"
              : resultType === "error"
                ? "bg-status-red-bg border-status-red-text/30 text-status-red-text"
                : "bg-bg-row-pending border-border-row-pending text-warning"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">{resultMessage}</p>
              {bulkResult && bulkResult.some((r) => !r.success) && (
                <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                  {bulkResult
                    .filter((r) => !r.success)
                    .map((r) => (
                      <li key={r.requestId}>
                        {r.requestId}: {r.reason ?? "不明なエラー"}
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <button
              onClick={closeAlert}
              className="ml-4 text-current opacity-60 hover:opacity-100"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <DataTable
        fixed
        columns={[
          ...(showBulkApproval
            ? [
                {
                  key: "checkbox",
                  header: "☐",
                  align: "center" as const,
                  width: "w-10",
                  render: (request: RequestItem) =>
                    request.status === "pending" ? (
                      <input
                        type="checkbox"
                        checked={selected.has(request.id)}
                        onChange={() => toggleSelect(request.id)}
                        disabled={isPending}
                        className="h-3 w-3"
                        aria-label={`${request.title}を選択`}
                      />
                    ) : (
                      <span />
                    ),
                },
              ]
            : []),
          {
            key: "title",
            header: "件名",
            render: (request: RequestItem) => (
              <div className="truncate">
                <Link
                  href={`/requests/${request.id}`}
                  className={
                    isActionable(request)
                      ? "text-text underline hover:text-primary"
                      : "text-text-disabled hover:text-text-muted"
                  }
                >
                  {request.title}
                </Link>
              </div>
            ),
          },
          {
            key: "creatorName",
            header: "申請者",
            width: "w-[90px]",
            render: (request: RequestItem) => (
              <div className="truncate text-text-secondary">{request.creatorName}</div>
            ),
          },
          {
            key: "status",
            header: "ステータス",
            align: "center" as const,
            width: "w-[110px]",
            render: (request: RequestItem) => (
              <StatusBadge variant={request.statusVariant}>{request.statusText}</StatusBadge>
            ),
          },
          {
            key: "originType",
            header: "種別",
            align: "center" as const,
            width: "w-[90px]",
            render: (request: RequestItem) => <OriginTypeLabel originType={request.originType} />,
          },
          {
            key: "createdAt",
            header: "申請日",
            width: "w-[110px]",
            render: (request: RequestItem) => (
              <span className="text-text-muted font-sans">{formatDate(request.createdAt)}</span>
            ),
          },
        ]}
        rows={requests}
        rowKey={(request) => request.id}
        rowClass={(request) =>
          request.status === "pending"
            ? "bg-bg-row-pending"
            : request.status === "revision"
              ? "bg-bg-row-revision"
              : undefined
        }
        rowHref={(request) => `/requests/${request.id}`}
        footer={`全${total}件 (承認待:${pendingCount}　承認済:${approvedCount}　却下:${rejectedCount})`}
      />

      {showBulkApproval && selectedCount > 0 && (
        <div className="bg-bg-toolbar border border-border border-t-0 px-2 py-1 flex justify-end">
          <button
            onClick={handleBulkApprove}
            disabled={isPending}
            className="text-xs text-primary underline disabled:text-text-on-dark-secondary disabled:no-underline"
          >
            {isPending ? "処理中..." : `[${selectedCount}件を一括承認]`}
          </button>
        </div>
      )}
    </div>
  );
}
