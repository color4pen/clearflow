"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/actions/requests";
import { SubmitButton, LinkButton, FormField, Textarea, preventEnterSubmit } from "@/app/components";

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

  if (requestStatus === "pending") {
    return (
      <div className="border-t border-border-light pt-4">
        <h3 className="text-xs font-bold text-text mb-2">アクション</h3>
        <div className="flex items-center gap-2 mb-4">
          <ActionForm action={approveAction}>
            {(isPending) => (
              <LinkButton variant="success" disabled={isPending}>
                承認
              </LinkButton>
            )}
          </ActionForm>
          <span className="text-text-muted text-xs">|</span>
          <ActionForm action={rejectAction}>
            {(isPending) => (
              <>
                <input type="hidden" name="targetStatus" value="rejected" />
                <LinkButton variant="danger" disabled={isPending}>
                  却下
                </LinkButton>
              </>
            )}
          </ActionForm>
          <span className="text-text-muted text-xs">|</span>
          <ActionForm action={rejectAction} className="space-y-2">
            {(isPending) => (
              <>
                <input type="hidden" name="targetStatus" value="revision" />
                <LinkButton variant="warning" disabled={isPending}>
                  差戻
                </LinkButton>
              </>
            )}
          </ActionForm>
        </div>
        {/* 差し戻しフォーム */}
        <div className="mt-2">
          <ActionForm action={rejectAction} className="space-y-2">
            {(isPending) => (
              <>
                <input type="hidden" name="targetStatus" value="revision" />
                <FormField label="差し戻しコメント" htmlFor="revision-comment">
                  <Textarea
                    id="revision-comment"
                    name="comment"
                    rows={3}
                    placeholder="差し戻し理由を入力してください"
                  />
                </FormField>
                <SubmitButton pending={isPending}>
                  差し戻す
                </SubmitButton>
              </>
            )}
          </ActionForm>
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
