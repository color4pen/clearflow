"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { BulkApproveActionResult } from "@/app/actions/requests";

type RequestItem = {
  id: string;
  title: string;
  status: string;
  statusText: string;
  statusClass: string;
  amount: number | null;
  createdAt: Date;
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
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleBulkApprove}
            disabled={selectedCount === 0 || isPending}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {isPending ? "処理中..." : `一括承認（${selectedCount}件）`}
          </button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showBulkApproval && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  選択
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タイトル
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                作成日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((request) => (
              <tr
                key={request.id}
                className="hover:bg-gray-50 cursor-pointer"
              >
                {showBulkApproval && (
                  <td className="px-4 py-4">
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
                <td className="px-6 py-4">
                  <Link
                    href={`/requests/${request.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {request.title}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${request.statusClass}`}
                  >
                    {request.statusText}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatAmount(request.amount)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {request.createdAt.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
