"use client";

import { useActionState, useEffect, useRef } from "react";
import { provisionOrganizationAction } from "@/app/actions/platform";
import type { ProvisionOrganizationState } from "@/app/actions/platform";

export function ProvisionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<
    ProvisionOrganizationState,
    FormData
  >(provisionOrganizationAction, null);

  useEffect(() => {
    if (state?.success === true) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div>
      <h2 className="text-sm font-bold text-gray-900 mb-4">新規組織を作成</h2>

      {state?.success === true && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-xs text-green-800">組織を作成しました。</p>
        </div>
      )}
      {state?.success === false && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-700">{state.message}</p>
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="organizationName"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            組織名 <span className="text-red-500">*</span>
          </label>
          <input
            id="organizationName"
            type="text"
            name="organizationName"
            required
            maxLength={100}
            placeholder="例: 株式会社サンプル"
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <p className="text-xs font-medium text-gray-700 mb-3">
            初期管理者アカウント
          </p>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="adminEmail"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="adminEmail"
                type="email"
                name="adminEmail"
                required
                placeholder="admin@example.com"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="adminName"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                名前 <span className="text-red-500">*</span>
              </label>
              <input
                id="adminName"
                type="text"
                name="adminName"
                required
                placeholder="山田 太郎"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="adminPassword"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                初期パスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="adminPassword"
                type="password"
                name="adminPassword"
                required
                minLength={8}
                placeholder="8文字以上"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium px-4 py-2 rounded"
        >
          {pending ? "作成中..." : "組織を作成"}
        </button>
      </form>
    </div>
  );
}
