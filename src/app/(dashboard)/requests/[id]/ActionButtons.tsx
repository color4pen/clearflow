"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions/requests";

export type ServerAction = (formData: FormData) => Promise<ActionResult>;

/**
 * Wrapper that calls a Server Action via onSubmit, adds an idempotency key,
 * tracks pending state, and surfaces any error message returned by the action.
 */
function ActionForm({
  action,
  className,
  children,
}: {
  action: ServerAction;
  className?: string;
  children: (isPending: boolean) => React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("idempotencyKey", crypto.randomUUID());
    setErrorMessage(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.success) {
        setErrorMessage(
          result.message ?? "エラーが発生しました。画面を更新してください。"
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children(isPending)}
      {errorMessage && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

export function ActionButtons({
  requestStatus,
  submitAction,
  approveAction,
  rejectAction,
  resubmitAction,
}: {
  requestStatus: string;
  submitAction: ServerAction;
  approveAction: ServerAction;
  rejectAction: ServerAction;
  resubmitAction: ServerAction;
}) {
  if (requestStatus === "draft") {
    return (
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">アクション</h3>
        <ActionForm action={submitAction}>
          {(isPending) => (
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              提出する（審査へ）
            </button>
          )}
        </ActionForm>
      </div>
    );
  }

  if (requestStatus === "pending") {
    return (
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">アクション</h3>
        <div className="flex gap-3 flex-wrap">
          <ActionForm action={approveAction}>
            {(isPending) => (
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              >
                承認する
              </button>
            )}
          </ActionForm>
          <ActionForm action={rejectAction}>
            {(isPending) => (
              <>
                <input type="hidden" name="targetStatus" value="rejected" />
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  却下する
                </button>
              </>
            )}
          </ActionForm>
        </div>
        {/* 差し戻しフォーム */}
        <div className="mt-4">
          <ActionForm action={rejectAction} className="space-y-2">
            {(isPending) => (
              <>
                <input type="hidden" name="targetStatus" value="revision" />
                <div>
                  <label
                    htmlFor="revision-comment"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    差し戻しコメント
                  </label>
                  <textarea
                    id="revision-comment"
                    name="comment"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="差し戻し理由を入力してください"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  差し戻す
                </button>
              </>
            )}
          </ActionForm>
        </div>
      </div>
    );
  }

  if (requestStatus === "revision") {
    return (
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">アクション</h3>
        <ActionForm action={resubmitAction}>
          {(isPending) => (
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              再申請する
            </button>
          )}
        </ActionForm>
      </div>
    );
  }

  return null;
}
