"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { FormField, Input, SectionCard, SubmitButton } from "@/app/components";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-login-gradient)" }}
    >
      <div className="max-w-[380px] w-full space-y-4">
        <div>
          <h1 className="text-xl font-bold text-center text-primary">
            Clearflow
          </h1>
          <h2 className="mt-1 text-center text-xs text-text-muted">
            案件管理システム
          </h2>
        </div>

        <SectionCard className="rounded-xl p-9 shadow-lg">
          {state.message && (
            <div className="mb-4 p-3 bg-status-red-bg border border-status-red-text text-status-red-text text-xs">
              {state.message}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <FormField
              label="メールアドレス"
              htmlFor="email"
              error={state.errors?.email?.[0]}
            >
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@example.com"
              />
            </FormField>

            <FormField
              label="パスワード"
              htmlFor="password"
              error={state.errors?.password?.[0]}
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </FormField>

            <SubmitButton pending={isPending} pendingText="ログイン中..." className="w-full flex justify-center">
              ログイン
            </SubmitButton>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
