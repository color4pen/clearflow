"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createRequestAction,
  type CreateRequestState,
} from "@/app/actions/requests";

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">新規申請</h2>
        <p className="mt-1 text-sm text-gray-600">
          申請内容を入力してください
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 max-w-2xl">
        {state.message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="申請のタイトルを入力"
            />
            {state.errors?.title && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.title[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              説明（任意）
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="申請の詳細を入力（任意）"
            />
            {state.errors?.description && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.description[0]}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              金額（任意）
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="金額を入力（任意）"
            />
            {state.errors?.amount && (
              <p className="mt-1 text-sm text-red-600">
                {state.errors.amount[0]}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "作成中..." : "申請を作成"}
            </button>
            <Link
              href="/requests"
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
