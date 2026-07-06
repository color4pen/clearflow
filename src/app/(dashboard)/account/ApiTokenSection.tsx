"use client";

import { useActionState, useState } from "react";
import type { ApiToken } from "@/domain/models/apiToken";
import { createApiTokenAction, revokeApiTokenAction } from "@/app/actions/apiTokens";
import type { CreateApiTokenState, RevokeApiTokenState } from "@/app/actions/apiTokens";
import { FormField, Input, SubmitButton, ConfirmDialog } from "@/app/components";
import { formatDateJP } from "@/lib/dateUtils";

type Props = {
  initialTokens: ApiToken[];
};

function formatUsedAt(date: Date | null): string {
  return date ? formatDateJP(date) : "未使用";
}

function PlainTokenModal({
  plainToken,
  onClose,
}: {
  plainToken: string;
  onClose: () => void;
}) {
  return (
    <ConfirmDialog
      open
      title="APIトークンを発行しました"
      confirmLabel="コピー"
      cancelLabel="閉じる"
      onConfirm={() => {
        void navigator.clipboard.writeText(plainToken);
      }}
      onCancel={onClose}
    >
      <p className="text-xs text-danger font-medium mb-2">
        この画面を閉じると二度と表示できません。今すぐコピーしてください。
      </p>
      <div className="bg-bg-surface-alt border border-border rounded p-3 break-all font-mono text-xs select-all">
        {plainToken}
      </div>
    </ConfirmDialog>
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

  // 発行直後に一度だけ平文を表示する。閉じたトークンを記録し、再表示しない。
  // 一覧は Server Action の revalidatePath("/account") で更新されるためリロード不要。
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const newPlainToken = state?.success === true ? state.plainToken : null;
  const showModal = newPlainToken !== null && newPlainToken !== dismissedToken;

  return (
    <div>
      <h2 className="text-sm font-bold text-text mb-3">APIトークン管理</h2>

      {state?.success === false && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-danger">{state.message}</p>
        </div>
      )}

      {showModal && newPlainToken && (
        <PlainTokenModal
          plainToken={newPlainToken}
          onClose={() => setDismissedToken(newPlainToken)}
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
        <p className="text-xs text-text-muted">APIトークンはまだありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-text-muted">名前</th>
                <th className="text-left py-2 pr-4 font-medium text-text-muted">トークン</th>
                <th className="text-left py-2 pr-4 font-medium text-text-muted">最終使用</th>
                <th className="text-left py-2 pr-4 font-medium text-text-muted">作成日</th>
                <th className="text-left py-2 font-medium text-text-muted">操作</th>
              </tr>
            </thead>
            <tbody>
              {initialTokens.map((token) => {
                const isRevoked = token.revokedAt !== null;
                return (
                  <tr
                    key={token.id}
                    className={`border-b border-border ${isRevoked ? "opacity-50" : ""}`}
                  >
                    <td className={`py-2 pr-4 ${isRevoked ? "line-through text-text-muted" : "text-text"}`}>
                      {token.name}
                    </td>
                    <td className="py-2 pr-4 font-mono text-text">
                      {token.tokenPrefix}...
                    </td>
                    <td className="py-2 pr-4 text-text-muted">
                      {formatUsedAt(token.lastUsedAt)}
                    </td>
                    <td className="py-2 pr-4 text-text-muted">
                      {formatUsedAt(token.createdAt)}
                    </td>
                    <td className="py-2">
                      {!isRevoked && <RevokeForm token={token} />}
                      {isRevoked && (
                        <span className="text-xs text-text-muted">失効済み</span>
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
