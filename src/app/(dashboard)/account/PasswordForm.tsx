"use client";

import { useActionState } from "react";
import { changeOwnPasswordAction } from "@/app/actions/account";
import type { ChangeOwnPasswordState } from "@/app/actions/account";
import { FormField, Input, SubmitButton } from "@/app/components";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<ChangeOwnPasswordState, FormData>(
    changeOwnPasswordAction,
    null
  );

  return (
    <div>
      <h2 className="text-sm font-bold text-text mb-3">パスワードを変更</h2>

      {state?.success === true && (
        <div className="mb-4 p-3 bg-bg-success-light border border-border-success-light rounded">
          <p className="text-xs text-success">パスワードを変更しました。</p>
        </div>
      )}
      {state?.success === false && (
        <div className="mb-4 p-3 bg-status-red-bg border border-status-red-text/30 rounded">
          <p className="text-xs text-danger">{state.message}</p>
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <FormField
          label={<>現在のパスワード <span className="text-danger">*</span></>}
          htmlFor="currentPassword"
        >
          <Input
            id="currentPassword"
            type="password"
            name="currentPassword"
            required
            placeholder="現在のパスワードを入力"
          />
        </FormField>

        <FormField
          label={<>新しいパスワード <span className="text-danger">*</span></>}
          htmlFor="newPassword"
        >
          <Input
            id="newPassword"
            type="password"
            name="newPassword"
            required
            placeholder="新しいパスワードを入力（8文字以上）"
          />
        </FormField>

        <SubmitButton pending={pending} pendingText="変更中...">
          パスワードを変更
        </SubmitButton>
      </form>
    </div>
  );
}
