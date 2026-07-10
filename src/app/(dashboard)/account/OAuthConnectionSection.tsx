"use client";

import { useState, useTransition } from "react";
import type { OAuthConnection } from "@/application/usecases/listOAuthConnections";
import { revokeOAuthConnectionAction } from "@/app/actions/oauthConnections";
import { ConfirmDialog, DataTable } from "@/app/components";
import { formatDateJP } from "@/lib/dateUtils";

type Props = {
  initialConnections: OAuthConnection[];
};

function formatUsedAt(date: Date | null): string {
  return date ? formatDateJP(date) : "未使用";
}

function RevokeButton({
  connection,
  onRevoked,
}: {
  connection: OAuthConnection;
  onRevoked: (clientId: string) => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeOAuthConnectionAction(connection.clientId);
      if (result.success) {
        onRevoked(connection.clientId);
      } else {
        setError(result.message);
      }
      setShowConfirm(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="text-xs text-danger hover:underline disabled:opacity-50"
      >
        {isPending ? "解除中..." : "接続解除"}
      </button>
      {error && <span className="ml-2 text-xs text-danger">{error}</span>}
      {showConfirm && (
        <ConfirmDialog
          open
          title="接続を解除しますか？"
          confirmLabel="解除する"
          cancelLabel="キャンセル"
          onConfirm={handleRevoke}
          onCancel={() => setShowConfirm(false)}
        >
          <p className="text-sm text-text-secondary">
            <strong>{connection.clientName}</strong> との接続を解除します。
            このアプリケーションは以後 clearflow にアクセスできなくなります。
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}

export function OAuthConnectionSection({ initialConnections }: Props) {
  const [connections, setConnections] = useState<OAuthConnection[]>(initialConnections);

  function handleRevoked(clientId: string) {
    setConnections((prev) => prev.filter((c) => c.clientId !== clientId));
  }

  return (
    <div>
      <h2 className="text-sm font-bold text-text mb-3">接続済みアプリケーション</h2>

      {connections.length === 0 ? (
        <p className="text-xs text-text-muted">接続済みアプリケーションはありません。</p>
      ) : (
        <DataTable
          columns={[
            {
              key: "clientName",
              header: "アプリケーション名",
              render: (conn) => <span className="text-text">{conn.clientName}</span>,
            },
            {
              key: "lastUsedAt",
              header: "最終使用",
              render: (conn) => <span className="text-text-muted">{formatUsedAt(conn.lastUsedAt)}</span>,
            },
            {
              key: "connectedAt",
              header: "許可日時",
              render: (conn) => <span className="text-text-muted">{formatDateJP(conn.connectedAt)}</span>,
            },
            {
              key: "actions",
              header: "操作",
              render: (conn) => <RevokeButton connection={conn} onRevoked={handleRevoked} />,
            },
          ]}
          rows={connections}
          rowKey={(conn) => conn.clientId}
        />
      )}
    </div>
  );
}
