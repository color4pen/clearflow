"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { addClientContactAction, deleteClientContactAction, updateClientContactAction } from "@/app/actions/clients";
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
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  async function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingContact) return;
    setIsEditing(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateClientContactAction(clientId, editingContact.id, formData);
    setIsEditing(false);

    if (result.success) {
      setEditingContact(null);
      router.refresh();
    } else {
      setError(result.message ?? "更新に失敗しました");
    }
  }

  function formatDeptPosition(contact: ClientContact): string {
    const parts = [contact.department, contact.position].filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : "-";
  }

  function formatContact(contact: ClientContact): string {
    const parts = [contact.email, contact.phone].filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : "-";
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
        <div
          className="text-xs"
          style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr 120px" }}
        >
          {/* ヘッダー行 */}
          <div className="text-text-muted py-1 px-2 border-b border-border">名前</div>
          <div className="text-text-muted py-1 px-2 border-b border-border">部署・役職</div>
          <div className="text-text-muted py-1 px-2 border-b border-border">連絡先</div>
          <div className="text-text-muted py-1 px-2 border-b border-border">アクション</div>

          {/* データ行 */}
          {contacts.map((contact) => {
            const rowClass = `py-1 px-2 border-b border-border-light text-text${
              editable ? " cursor-pointer hover:bg-primary/10" : ""
            }`;
            const onRowClick = editable ? () => setEditingContact(contact) : undefined;

            return (
              <Fragment key={contact.id}>
                <div className={rowClass} onClick={onRowClick}>
                  {contact.name}
                  {contact.isPrimary && (
                    <span className="ml-1 text-primary font-bold">[主]</span>
                  )}
                </div>
                <div className={rowClass} onClick={onRowClick}>
                  {formatDeptPosition(contact)}
                </div>
                <div className={rowClass} onClick={onRowClick}>
                  {formatContact(contact)}
                </div>
                <div className="py-1 px-2 border-b border-border-light">
                  {editable && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(contact.id);
                      }}
                      disabled={deletingId === contact.id}
                      className="text-danger underline text-xs cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === contact.id ? "削除中..." : "削除"}
                    </button>
                  )}
                </div>
              </Fragment>
            );
          })}
        </div>
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

      {editingContact && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-bg-surface border border-border p-4 max-w-md w-full">
            <p className="text-sm font-bold text-text mb-3">担当者を編集</p>
            <form onSubmit={handleEdit} onKeyDown={preventEnterSubmit}>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="col-span-2">
                  <label className="text-xs text-text-muted block mb-0.5">氏名 *</label>
                  <Input name="name" required defaultValue={editingContact.name} />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-0.5">部署</label>
                  <Input name="department" defaultValue={editingContact.department ?? ""} />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-0.5">役職</label>
                  <Input name="position" defaultValue={editingContact.position ?? ""} />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-0.5">メール</label>
                  <Input name="email" type="email" defaultValue={editingContact.email ?? ""} />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-0.5">電話</label>
                  <Input name="phone" defaultValue={editingContact.phone ?? ""} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-text-muted flex items-center gap-1">
                    <input type="checkbox" name="isPrimary" defaultChecked={editingContact.isPrimary} className="accent-primary" />
                    主担当
                  </label>
                </div>
              </div>
              {error && <p className="text-danger text-xs mb-2">{error}</p>}
              <div className="flex gap-2 justify-end mt-3">
                <button
                  type="button"
                  onClick={() => { setEditingContact(null); setError(null); }}
                  className="border border-border text-text text-xs px-3 py-1.5 cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="text-xs bg-primary text-white px-3 py-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isEditing ? "保存中..." : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
