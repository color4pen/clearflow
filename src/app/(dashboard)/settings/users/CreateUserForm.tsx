"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUserAction } from "@/app/actions/users";
import type { CreateUserState } from "@/app/actions/users";
import { FormField, Input, Select, SubmitButton, preventEnterSubmit } from "@/app/components";

export function CreateUserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<CreateUserState, FormData>(
    createUserAction,
    null
  );

  // Reset form on success
  useEffect(() => {
    if (state?.success === true) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div>
      <h2 className="text-sm font-bold text-text mb-3">ユーザーを追加</h2>

      {state?.success === true && (
        <div className="mb-4 p-3 bg-bg-success-light border border-border-success-light rounded">
          <p className="text-xs text-success">ユーザーを作成しました。</p>
        </div>
      )}
      {state?.success === false && (
        <div className="mb-4 p-3 bg-status-red-bg border border-status-red-text/30 rounded">
          <p className="text-xs text-danger">{state.message}</p>
        </div>
      )}

      <form
        ref={formRef}
        action={formAction}
        onKeyDown={preventEnterSubmit}
        className="space-y-3"
      >
        <FormField
          label={<>メールアドレス <span className="text-danger">*</span></>}
          htmlFor="email"
        >
          <Input
            id="email"
            type="email"
            name="email"
            required
            placeholder="user@example.com"
          />
        </FormField>

        <FormField
          label={<>名前 <span className="text-danger">*</span></>}
          htmlFor="name"
        >
          <Input
            id="name"
            type="text"
            name="name"
            required
            placeholder="山田 太郎"
          />
        </FormField>

        <FormField label="ロール" htmlFor="role">
          <Select id="role" name="role" defaultValue="member">
            <option value="member">メンバー</option>
            <option value="manager">マネージャー</option>
            <option value="finance">経理</option>
            <option value="admin">管理者</option>
          </Select>
        </FormField>

        <FormField
          label={<>初期パスワード <span className="text-danger">*</span></>}
          htmlFor="password"
        >
          <Input
            id="password"
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="8文字以上"
          />
        </FormField>

        <SubmitButton pending={pending} pendingText="作成中...">
          ユーザーを作成
        </SubmitButton>
      </form>
    </div>
  );
}
