"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createRequestAction,
  type CreateRequestState,
} from "@/app/actions/requests";
import { BTN_SUBMIT } from "../../styles";

const initialState: CreateRequestState = {};

export default function NewRequestPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createRequestAction,
    initialState
  );

  useEffect(() => {
    // Redirect on success (no errors, no message, and state has been touched)
    if (
      state !== initialState &&
      !state.errors &&
      !state.message
    ) {
      router.push("/requests");
    }
  }, [state, router]);

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-2">
        <span className="text-sm font-bold text-[#333333]">新規申請</span>
      </div>

      <div className="bg-bg-surface border border-border-light p-4">
        {state.message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger text-xs">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-xs font-bold text-text mb-1"
            >
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="w-full border border-border rounded-none px-2 py-1 text-xs focus:border-primary focus:outline-none"
              placeholder="申請のタイトルを入力"
            />
            {state.errors?.title && (
              <p className="mt-1 text-xs text-danger">
                {state.errors.title[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-xs font-bold text-text mb-1"
            >
              説明（任意）
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full border border-border rounded-none px-2 py-1 text-xs focus:border-primary focus:outline-none"
              placeholder="申請の詳細を入力（任意）"
            />
            {state.errors?.description && (
              <p className="mt-1 text-xs text-danger">
                {state.errors.description[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="amount"
              className="block text-xs font-bold text-text mb-1"
            >
              金額（任意）
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="1"
              className="w-full border border-border rounded-none px-2 py-1 text-xs focus:border-primary focus:outline-none"
              placeholder="金額を入力（任意）"
            />
            {state.errors?.amount && (
              <p className="mt-1 text-xs text-danger">
                {state.errors.amount[0]}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className={BTN_SUBMIT}
            >
              {isPending ? "作成中..." : "申請を作成"}
            </button>
            <Link
              href="/requests"
              className="text-xs text-text-muted underline"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
