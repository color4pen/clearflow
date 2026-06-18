"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { BulkApproveActionResult } from "@/app/actions/requests";
import { BTN_SUCCESS } from "../styles";

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
  if (steps.length === 0) return <span className="text-gray-400 text-xs">-</span>;

  return (
    <span className="text-xs text-gray-600 whitespace-nowrap">
      {steps.map((step, i) => (
        <span key={i}>
          {i > 0 && <span className="text-gray-400 mx-0.5">→</span>}
          <span className={step.status === "approved" ? "text-emerald-700" : step.status === "rejected" ? "text-red-600" : "text-gray-400"}>
            {step.status === "approved" ? "●" : "○"}
          </span>
          <span className="ml-0.5">{step.approverRole}</span>
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

      {showBulkApproval && (
        <div className="mb-2 flex justify-end">
          <button
            onClick={handleBulkApprove}
            disabled={selectedCount === 0 || isPending}
            className={`${BTN_SUCCESS} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPending ? "処理中..." : `一括承認（${selectedCount}件）`}
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-slate-50">
            <tr>
              {showBulkApproval && (
                <th className="px-3 py-1 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">
                  選択
                </th>
              )}
              <th className="px-3 py-1 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">
                タイトル
              </th>
              <th className="px-3 py-1 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-3 py-1 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">
                進捗
              </th>
              <th className="px-3 py-1 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">
                期限
              </th>
              <th className="px-3 py-1 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">
                金額
              </th>
              <th className="px-3 py-1 text-left text-xs text-slate-500 font-medium uppercase tracking-wider">
                作成日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => {
              const deadlineInfo = formatDeadline(request.currentDeadline);
              return (
                <tr
                  key={request.id}
                  className={`hover:bg-gray-50 cursor-pointer ${request.statusRowClass}`}
                >
                  {showBulkApproval && (
                    <td className="px-3 py-0.5">
                      {request.status === "pending" ? (
                        <input
                          type="checkbox"
                          checked={selected.has(request.id)}
                          onChange={() => toggleSelect(request.id)}
                          disabled={isPending}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          aria-label={`${request.title}を選択`}
                        />
                      ) : (
                        <span />
                      )}
                    </td>
                  )}
                  <td className="px-3 py-0.5">
                    <Link
                      href={`/requests/${request.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {request.title}
                    </Link>
                  </td>
                  <td className="px-3 py-0.5">
                    <span className={`text-xs ${request.statusClass}`}>
                      {request.statusText}
                    </span>
                  </td>
                  <td className="px-3 py-0.5">
                    <ApprovalProgress steps={request.approvalSteps} />
                  </td>
                  <td className="px-3 py-0.5">
                    <span
                      className={
                        deadlineInfo.urgent
                          ? "text-red-600 font-bold text-xs"
                          : "text-gray-500 text-xs"
                      }
                    >
                      {deadlineInfo.text}
                    </span>
                  </td>
                  <td className="px-3 py-0.5 text-xs text-gray-500">
                    {formatAmount(request.amount)}
                  </td>
                  <td className="px-3 py-0.5 text-xs text-gray-500">
                    {request.createdAt.toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-slate-400">
        {total}件中 1-{total}件表示 | 承認待: {pendingCount}件 承認済: {approvedCount}件 却下: {rejectedCount}件
      </div>
    </div>
  );
}
