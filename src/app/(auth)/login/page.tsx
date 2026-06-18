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
    <div className="min-h-screen flex items-center justify-center bg-bg-page">
      <div className="max-w-md w-full space-y-4 px-4">
        <div>
          <h1 className="text-sm font-bold text-center text-text">
            Clearflow
          </h1>
          <h2 className="mt-1 text-center text-xs text-text-muted">
            承認ワークフローシステム
          </h2>
        </div>

        <SectionCard className="py-4 px-4">
          <h3 className="text-sm font-bold text-text mb-4">
            ログイン
          </h3>

          {state.message && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger text-xs">
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
