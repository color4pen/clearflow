"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { BTN_SUBMIT } from "@/app/(dashboard)/styles";

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

        <div className="bg-bg-surface border border-border-light py-4 px-4">
          <h3 className="text-sm font-bold text-text mb-4">
            ログイン
          </h3>

          {state.message && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger text-xs">
              {state.message}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-text mb-1"
              >
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full border border-border rounded-none px-2 py-1 text-xs focus:border-primary focus:outline-none"
                placeholder="admin@example.com"
              />
              {state.errors?.email && (
                <p className="mt-1 text-xs text-danger">
                  {state.errors.email[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-text mb-1"
              >
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full border border-border rounded-none px-2 py-1 text-xs focus:border-primary focus:outline-none"
              />
              {state.errors?.password && (
                <p className="mt-1 text-xs text-danger">
                  {state.errors.password[0]}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className={`w-full flex justify-center ${BTN_SUBMIT}`}
            >
              {isPending ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
