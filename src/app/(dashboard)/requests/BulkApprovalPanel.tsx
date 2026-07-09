"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
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

type BulkResult = BulkApproveActionResult["results"];

function RowClickHandler() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("a,button,input")) return;
      const row = target.closest("tr[data-href]");
      if (row) {
        window.location.href = (row as HTMLElement).dataset.href!;
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
  return null;
}

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
      <RowClickHandler />

      {resultMessage && (
        <div
          className={`mb-4 p-4 border ${
            resultType === "success"
              ? "bg-green-50 border-green-300 text-green-800"
              : resultType === "error"
                ? "bg-red-50 border-red-300 text-red-800"
                : "bg-yellow-50 border-yellow-300 text-yellow-800"
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

      <div className="overflow-hidden border border-border border-t-0">
        <table className="w-full border-collapse table-fixed">
          <colgroup>
            {showBulkApproval && <col className="w-6" />}
            <col />
            <col style={{ width: "90px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "110px" }} />
          </colgroup>
          <thead>
            <tr className="bg-bg-table-head border-b border-border-table-head">
              {showBulkApproval && (
                <th className="px-1 py-1.5 text-xs text-text font-bold text-center">☐</th>
              )}
              <th className="px-2 py-1.5 text-xs text-text font-bold text-left">件名</th>
              <th className="px-2 py-1.5 text-xs text-text font-bold text-left">申請者</th>
              <th className="px-2 py-1.5 text-xs text-text font-bold text-center">ステータス</th>
              <th className="px-2 py-1.5 text-xs text-text font-bold text-center">種別</th>
              <th className="px-2 py-1.5 text-xs text-text font-bold text-left">申請日</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request, idx) => {
              const isActionable =
                request.status === "pending" ||
                request.status === "revision" ||
                request.status === "draft";
              const rowBg =
                request.status === "pending"
                  ? "bg-bg-row-pending"
                  : request.status === "revision"
                    ? "bg-bg-row-revision"
                    : idx % 2 === 0
                      ? "bg-bg-surface"
                      : "bg-bg-surface-alt";

              return (
                <tr
                  key={request.id}
                  data-href={`/requests/${request.id}`}
                  className={`${rowBg} border-b border-border-light hover:bg-bg-surface-alt cursor-pointer`}
                >
                  {showBulkApproval && (
                    <td className="px-1 py-1.5 text-center">
                      {request.status === "pending" ? (
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
                      )}
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-xs truncate">
                    <Link
                      href={`/requests/${request.id}`}
                      className={
                        isActionable
                          ? "text-text underline hover:text-primary"
                          : "text-text-disabled hover:text-text-muted"
                      }
                    >
                      {request.title}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-text-secondary truncate">
                    {request.creatorName}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <StatusBadge variant={request.statusVariant}>{request.statusText}</StatusBadge>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <OriginTypeLabel originType={request.originType} />
                  </td>
                  <td className="px-2 py-1.5 text-xs text-text-muted font-sans">
                    {formatDate(request.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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

      <div className="bg-bg-toolbar border border-border border-t-0 px-2 py-1.5">
        <span className="text-xs text-text-muted">
          全{total}件 (承認待:{pendingCount}　承認済:{approvedCount}　却下:{rejectedCount})
        </span>
      </div>
    </div>
  );
}
