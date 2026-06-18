"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
  statusClass: string;
  statusRowClass: string;
  amount: number | null;
  creatorId: string;
  createdAt: Date;
  approvalSteps: ApprovalStepItem[];
  currentDeadline: Date | null;
};

type Props = {
  requests: RequestItem[];
  bulkApproveAction: (requestIds: string[]) => Promise<BulkApproveActionResult>;
  showBulkApproval?: boolean;
};

function formatAmount(amount: number | null): string {
  if (amount === null) return "-";
  return amount.toLocaleString("ja-JP") + "円";
}

function formatDeadline(deadline: Date | null): { text: string; urgent: boolean } {
  if (!deadline) return { text: "-", urgent: false };
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return { text: "期限切れ", urgent: true };
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const days = Math.floor(diffDays);
  if (days < 1) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    return { text: `${hours}時間`, urgent: true };
  }
  return {
    text: `${days}日`,
    urgent: days <= 3,
  };
}

function ApprovalProgress({ steps }: { steps: ApprovalStepItem[] }) {
  if (steps.length === 0) return <span className="text-[#dcdde1] text-xs">-</span>;

  return (
    <span className="text-xs font-sans whitespace-nowrap">
      {steps.map((step, i) => (
        <span key={i}>
          {i > 0 && <span className="text-[#7f8c8d] mx-0.5">{"→"}</span>}
          <span className={step.status === "approved" ? "text-[#1a8a4a]" : step.status === "rejected" ? "text-[#c0392b]" : "text-[#7f8c8d]"}>
            {step.status === "approved" ? "■" : step.status === "rejected" ? "✕" : "□"}
          </span>
          <span className="ml-0.5 text-[#7f8c8d]">{step.approverRole}</span>
        </span>
      ))}
    </span>
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
          className={`mb-4 p-4 rounded-md border ${
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

      <div className="overflow-hidden border-t-0">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-[#dcdde1] border border-[#bdc3c7]">
              {showBulkApproval && (
                <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-center w-6">☐</th>
              )}
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left w-8">No.</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">件名</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-right w-20">金額</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-center w-14">状態</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-center w-32">承認経路</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left w-16">申請者</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left w-12 font-sans">申請日</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-center w-12">期限</th>
              <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-center w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request, idx) => {
              const deadlineInfo = formatDeadline(request.currentDeadline);
              const isActionable = request.status === "pending" || request.status === "revision" || request.status === "draft";
              const rowBg = request.status === "pending"
                ? "bg-[#fdf6e3] border-[#e8d5a3]"
                : request.status === "revision"
                  ? "bg-[#fef0e5] border-[#f0d0b0]"
                  : idx % 2 === 0
                    ? "bg-white border-[#e0e0e0]"
                    : "bg-[#f9f9f9] border-[#e0e0e0]";
              const textColor = isActionable ? "text-[#2c3e50]" : "text-[#95a5a6]";
              const idColor = isActionable ? "text-[#7f8c8d]" : "text-[#bdc3c7]";

              return (
                <tr key={request.id} className={`${rowBg} border hover:bg-[#eef2f7]`}>
                  {showBulkApproval && (
                    <td className="px-1 py-1 text-center">
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
                  <td className={`px-1 py-1 text-xs ${idColor}`}>
                    {request.id.slice(0, 4)}
                  </td>
                  <td className={`px-1 py-1 text-xs ${textColor}`}>
                    <Link
                      href={`/requests/${request.id}`}
                      className={isActionable ? "text-[#2c3e50] underline hover:text-[#2980b9]" : "text-[#95a5a6] hover:text-[#7f8c8d]"}
                    >
                      {request.title}
                    </Link>
                  </td>
                  <td className="px-1 py-1 text-right font-sans text-xs">
                    <span className={textColor}>
                      {request.amount !== null ? request.amount.toLocaleString("ja-JP") : "-"}
                    </span>
                  </td>
                  <td className="px-1 py-1 text-center">
                    <span className={`text-xs ${request.statusClass}`}>
                      {request.statusText}
                    </span>
                  </td>
                  <td className="px-1 py-1 text-center">
                    <ApprovalProgress steps={request.approvalSteps} />
                  </td>
                  <td className={`px-1 py-1 text-xs ${isActionable ? "text-[#555555]" : "text-[#95a5a6]"}`}>
                    {request.creatorId.slice(0, 8)}
                  </td>
                  <td className={`px-1 py-1 text-xs font-sans ${idColor}`}>
                    {String(request.createdAt.getMonth() + 1).padStart(2, "0")}/{String(request.createdAt.getDate()).padStart(2, "0")}
                  </td>
                  <td className="px-1 py-1 text-center">
                    <span className={deadlineInfo.urgent ? "text-[#c0392b] font-bold text-xs" : "text-[#7f8c8d] text-xs"}>
                      {deadlineInfo.text === "-" ? <span className="text-[#dcdde1]">-</span> : deadlineInfo.urgent ? `残${deadlineInfo.text}` : `残${deadlineInfo.text}`}
                    </span>
                  </td>
                  <td className="px-1 py-1 text-center">
                    {request.status === "pending" && (
                      <span className="text-xs text-[#2980b9] underline">承認 | 却下 | 差戻</span>
                    )}
                    {request.status === "revision" && (
                      <span className="text-xs text-[#2980b9] underline">再申請</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showBulkApproval && selectedCount > 0 && (
        <div className="bg-[#f5f5f5] border border-[#cccccc] border-t-0 px-2 py-1 flex justify-end">
          <button
            onClick={handleBulkApprove}
            disabled={isPending}
            className="text-xs text-[#2980b9] underline disabled:text-[#bdc3c7] disabled:no-underline"
          >
            {isPending ? "処理中..." : `[${selectedCount}件を一括承認]`}
          </button>
        </div>
      )}

      <div className="bg-[#f5f5f5] border border-[#cccccc] border-t-0 px-2 py-1.5">
        <span className="text-xs text-[#7f8c8d]">
          全{total}件 (承認待:{pendingCount}  承認済:{approvedCount}  却下:{rejectedCount})
        </span>
      </div>
    </div>
  );
}
