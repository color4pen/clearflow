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
    <div className="min-h-screen flex items-center justify-center bg-[#e8e8e8]">
      <div className="max-w-md w-full space-y-4 px-4">
        <div>
          <h1 className="text-sm font-bold text-center text-[#2c3e50]">
            Clearflow
          </h1>
          <h2 className="mt-1 text-center text-xs text-[#7f8c8d]">
            承認ワークフローシステム
          </h2>
        </div>

        <div className="bg-white border border-[#e0e0e0] py-4 px-4">
          <h3 className="text-sm font-bold text-[#2c3e50] mb-4">
            ログイン
          </h3>

          {state.message && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-[#c0392b] text-xs">
              {state.message}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-[#2c3e50] mb-1"
              >
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none"
                placeholder="admin@example.com"
              />
              {state.errors?.email && (
                <p className="mt-1 text-xs text-[#c0392b]">
                  {state.errors.email[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-[#2c3e50] mb-1"
              >
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full border border-[#cccccc] rounded-none px-2 py-1 text-xs focus:border-[#2980b9] focus:outline-none"
              />
              {state.errors?.password && (
                <p className="mt-1 text-xs text-[#c0392b]">
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
