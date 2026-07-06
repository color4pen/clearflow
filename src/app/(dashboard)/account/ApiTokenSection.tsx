"use client";

import { useActionState } from "react";
import type { ApiToken } from "@/domain/models/apiToken";
import { createApiTokenAction, revokeApiTokenAction } from "@/app/actions/apiTokens";
import type { CreateApiTokenState, RevokeApiTokenState } from "@/app/actions/apiTokens";
import { FormField, Input, SubmitButton } from "@/app/components";

type Props = {
  initialTokens: ApiToken[];
};

function formatDate(date: Date | null): string {
  if (!date) return "未使用";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function PlainTokenModal({
  plainToken,
  onClose,
}: {
  plainToken: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
        <h3 className="text-sm font-bold text-text mb-3">APIトークンを発行しました</h3>
        <p className="text-xs text-danger font-medium mb-3">
          この画面を閉じると二度と表示できません。今すぐコピーしてください。
        </p>
        <div className="bg-gray-100 rounded p-3 mb-4 break-all font-mono text-xs select-all">
          {plainToken}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(plainToken);
            }}
            className="flex-1 py-2 px-4 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            コピー
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function RevokeForm({ token }: { token: ApiToken }) {
  const [state, formAction, pending] = useActionState<RevokeApiTokenState, FormData>(
    revokeApiTokenAction,
    null
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="tokenId" value={token.id} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-danger hover:underline disabled:opacity-50"
      >
        {pending ? "失効中..." : "失効"}
      </button>
      {state?.success === false && (
        <span className="ml-2 text-xs text-danger">{state.message}</span>
      )}
    </form>
  );
}

export function ApiTokenSection({ initialTokens }: Props) {
  const [state, formAction, pending] = useActionState<CreateApiTokenState, FormData>(
    createApiTokenAction,
    null
  );

  const showModal = state?.success === true;

  return (
    <div>
      <h2 className="text-sm font-bold text-text mb-3">APIトークン管理</h2>

      {state?.success === false && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-danger">{state.message}</p>
        </div>
      )}

      {showModal && (
        <PlainTokenModal
          plainToken={state.plainToken}
          onClose={() => {
            // フォームリセットのためページをリロード
            window.location.reload();
          }}
        />
      )}

      {/* 発行フォーム */}
      <form action={formAction} className="space-y-3 mb-6">
        <FormField label="トークン名" htmlFor="api-token-name">
          <Input
            id="api-token-name"
            type="text"
            name="name"
            required
            placeholder="例: MCP用"
            maxLength={100}
          />
        </FormField>
        <SubmitButton pending={pending} pendingText="発行中...">
          発行
        </SubmitButton>
      </form>

      {/* トークン一覧 */}
      {initialTokens.length === 0 ? (
        <p className="text-xs text-gray-500">APIトークンはまだありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-gray-600">名前</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">トークン</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">最終使用</th>
                <th className="text-left py-2 pr-4 font-medium text-gray-600">作成日</th>
                <th className="text-left py-2 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody>
              {initialTokens.map((token) => {
                const isRevoked = token.revokedAt !== null;
                return (
                  <tr
                    key={token.id}
                    className={`border-b ${isRevoked ? "opacity-50" : ""}`}
                  >
                    <td className={`py-2 pr-4 ${isRevoked ? "line-through text-gray-400" : ""}`}>
                      {token.name}
                    </td>
                    <td className="py-2 pr-4 font-mono">
                      {token.tokenPrefix}...
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {formatDate(token.lastUsedAt)}
                    </td>
                    <td className="py-2 pr-4 text-gray-500">
                      {formatDate(token.createdAt)}
                    </td>
                    <td className="py-2">
                      {!isRevoked && <RevokeForm token={token} />}
                      {isRevoked && (
                        <span className="text-xs text-gray-400">失効済み</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
