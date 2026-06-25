"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions/requests";
import { SubmitButton, FormField, Textarea, preventEnterSubmit } from "@/app/components";
// Textarea is used for the comment field in the approval action form

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
    <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit} className={className}>
      {children(isPending)}
      {errorMessage && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

export function ActionButtons({
  requestStatus,
  isCurrentApprover,
  submitAction,
  approveAction,
  rejectAction,
  resubmitAction,
}: {
  requestStatus: string;
  isCurrentApprover: boolean;
  submitAction: ServerAction;
  approveAction: ServerAction;
  rejectAction: ServerAction;
  resubmitAction: ServerAction;
}) {
  const [comment, setComment] = useState("");

  if (requestStatus === "draft") {
    return (
      <div className="border-t border-border-light pt-4">
        <h3 className="text-xs font-bold text-text mb-2">アクション</h3>
        <ActionForm action={submitAction}>
          {(isPending) => (
            <SubmitButton pending={isPending}>
              提出する（審査へ）
            </SubmitButton>
          )}
        </ActionForm>
      </div>
    );
  }

  if (requestStatus === "pending" && isCurrentApprover) {
    return (
      <div className="border-t border-border-light pt-4">
        <h3 className="text-xs font-bold text-text mb-3">承認操作</h3>
        <div className="space-y-4">
          {/* Comment field — controlled so its value can be injected into each form */}
          <FormField label="コメント（任意）" htmlFor="action-comment">
            <Textarea
              id="action-comment"
              rows={3}
              placeholder="コメントを入力してください"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </FormField>

          <div className="flex items-center gap-3">
            {/* Approve form — hidden comment input carries the controlled value */}
            <ActionForm action={approveAction} className="contents">
              {(isPending) => (
                <>
                  <input type="hidden" name="comment" value={comment} />
                  <SubmitButton pending={isPending}>
                    承認する
                  </SubmitButton>
                </>
              )}
            </ActionForm>

            {/* Reject form — hidden comment input carries the controlled value */}
            <ActionForm action={rejectAction}>
              {(isPending) => (
                <>
                  <input type="hidden" name="comment" value={comment} />
                  <input type="hidden" name="targetStatus" value="rejected" />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="text-xs border border-danger text-danger bg-white rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? "処理中..." : "却下する"}
                  </button>
                </>
              )}
            </ActionForm>
          </div>
        </div>
      </div>
    );
  }

  if (requestStatus === "revision") {
    return (
      <div className="border-t border-border-light pt-4">
        <h3 className="text-xs font-bold text-text mb-2">アクション</h3>
        <ActionForm action={resubmitAction}>
          {(isPending) => (
            <SubmitButton pending={isPending}>
              再申請する
            </SubmitButton>
          )}
        </ActionForm>
      </div>
    );
  }

  return null;
}
