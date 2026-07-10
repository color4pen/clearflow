"use client";

import { useActionState, useState } from "react";
import type { ApiToken } from "@/domain/models/apiToken";
import { createApiTokenAction, revokeApiTokenAction } from "@/app/actions/apiTokens";
import type { CreateApiTokenState, RevokeApiTokenState } from "@/app/actions/apiTokens";
import { FormField, Input, SubmitButton, ConfirmDialog, DataTable } from "@/app/components";
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
        <div className="mb-4 p-3 bg-status-red-bg border border-status-red-text/30 rounded">
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
        <DataTable
          columns={[
            {
              key: "name",
              header: "名前",
              render: (token) => (
                <span className={token.revokedAt !== null ? "line-through text-text-muted" : "text-text"}>
                  {token.name}
                </span>
              ),
            },
            {
              key: "token",
              header: "トークン",
              render: (token) => <span className="font-mono">{token.tokenPrefix}...</span>,
            },
            {
              key: "lastUsedAt",
              header: "最終使用",
              render: (token) => <span className="text-text-muted">{formatUsedAt(token.lastUsedAt)}</span>,
            },
            {
              key: "createdAt",
              header: "作成日",
              render: (token) => <span className="text-text-muted">{formatUsedAt(token.createdAt)}</span>,
            },
            {
              key: "actions",
              header: "操作",
              render: (token) =>
                token.revokedAt === null ? (
                  <RevokeForm token={token} />
                ) : (
                  <span className="text-xs text-text-muted">失効済み</span>
                ),
            },
          ]}
          rows={initialTokens}
          rowKey={(token) => token.id}
          rowClass={(token, idx) =>
            token.revokedAt !== null
              ? `opacity-50 ${idx % 2 === 0 ? "bg-bg-surface" : "bg-bg-surface-alt"}`
              : undefined
          }
        />
      )}
    </div>
  );
}
