"use client";

import { useState, useTransition } from "react";
import type { OAuthConnection } from "@/application/usecases/listOAuthConnections";
import { revokeOAuthConnectionAction } from "@/app/actions/oauthConnections";
import { ConfirmDialog } from "@/app/components";
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
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-text-muted">アプリケーション名</th>
                <th className="text-left py-2 pr-4 font-medium text-text-muted">最終使用</th>
                <th className="text-left py-2 pr-4 font-medium text-text-muted">許可日時</th>
                <th className="text-left py-2 font-medium text-text-muted">操作</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((conn) => (
                <tr key={conn.clientId} className="border-b border-border">
                  <td className="py-2 pr-4 text-text">{conn.clientName}</td>
                  <td className="py-2 pr-4 text-text-muted">{formatUsedAt(conn.lastUsedAt)}</td>
                  <td className="py-2 pr-4 text-text-muted">{formatDateJP(conn.connectedAt)}</td>
                  <td className="py-2">
                    <RevokeButton connection={conn} onRevoked={handleRevoked} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
