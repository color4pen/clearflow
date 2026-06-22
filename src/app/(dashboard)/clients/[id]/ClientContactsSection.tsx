"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addClientContactAction, deleteClientContactAction } from "@/app/actions/clients";
import { Input, preventEnterSubmit } from "@/app/components";
import type { ClientContact } from "@/domain/models/client";

type Props = {
  clientId: string;
  contacts: ClientContact[];
  editable: boolean;
};

export function ClientContactsSection({ clientId, contacts, editable }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsAdding(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await addClientContactAction(clientId, formData);
    setIsAdding(false);

    if (result.success) {
      setShowForm(false);
      router.refresh();
    } else {
      setError(result.message ?? "追加に失敗しました");
    }
  }

  async function handleDelete(contactId: string) {
    if (!window.confirm("この担当者を削除しますか？")) return;

    setDeletingId(contactId);
    setError(null);

    const result = await deleteClientContactAction(clientId, contactId);
    setDeletingId(null);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.message ?? "削除に失敗しました");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-1 border-b border-border-light">
        <h2 className="text-xs font-bold text-text">担当者一覧</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-danger text-xs">{error}</span>}
          {editable && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="text-xs text-primary underline cursor-pointer"
            >
              追加
            </button>
          )}
        </div>
      </div>

      {contacts.length === 0 && !showForm ? (
        <p className="text-xs text-text-muted px-2 py-3">担当者が登録されていません</p>
      ) : contacts.length > 0 ? (
        <table className="text-xs w-full">
          <thead>
            <tr className="text-text-muted border-b border-border">
              <th className="text-left py-1 px-2">氏名</th>
              <th className="text-left py-1 px-2">部署</th>
              <th className="text-left py-1 px-2">役職</th>
              <th className="text-left py-1 px-2">メール</th>
              <th className="text-left py-1 px-2">電話</th>
              <th className="text-left py-1 px-2">主担当</th>
              {editable && <th className="py-1 px-2"></th>}
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className="border-b border-border-light">
                <td className="py-1 px-2 text-text">{contact.name}</td>
                <td className="py-1 px-2 text-text">{contact.department ?? "-"}</td>
                <td className="py-1 px-2 text-text">{contact.position ?? "-"}</td>
                <td className="py-1 px-2 text-text">{contact.email ?? "-"}</td>
                <td className="py-1 px-2 text-text">{contact.phone ?? "-"}</td>
                <td className="py-1 px-2 text-text">{contact.isPrimary ? "[主]" : "-"}</td>
                {editable && (
                  <td className="py-1 px-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(contact.id)}
                      disabled={deletingId === contact.id}
                      className="text-danger underline text-xs cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === contact.id ? "削除中..." : "削除"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {showForm && (
        <form onSubmit={handleAdd} onKeyDown={preventEnterSubmit} className="px-2 py-2 border-t border-border-light">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-xs text-text-muted block mb-0.5">氏名 *</label>
              <Input name="name" required placeholder="氏名" />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-0.5">部署</label>
              <Input name="department" placeholder="部署" />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-0.5">役職</label>
              <Input name="position" placeholder="役職" />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-0.5">メール</label>
              <Input name="email" type="email" placeholder="メール" />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-0.5">電話</label>
              <Input name="phone" placeholder="電話" />
            </div>
            <div className="flex items-end pb-1">
              <label className="text-xs text-text-muted flex items-center gap-1">
                <input type="checkbox" name="isPrimary" className="accent-primary" />
                主担当
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isAdding}
              className="text-xs bg-primary text-white px-3 py-1 cursor-pointer disabled:opacity-50"
            >
              {isAdding ? "追加中..." : "追加"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="text-xs text-text-muted underline cursor-pointer"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
