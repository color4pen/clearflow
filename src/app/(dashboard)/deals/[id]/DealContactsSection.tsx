"use client";

import { useState } from "react";
import { addDealContactAction, removeDealContactAction } from "@/app/actions/dealContacts";
import { dealContactRoleLabels } from "@/app/(dashboard)/labels";
import { preventEnterSubmit } from "@/app/components";
import type { DealContact } from "@/domain/models/deal";
import type { ClientContact } from "@/domain/models/client";

type Props = {
  dealId: string;
  dealContacts: DealContact[];
  clientContacts: ClientContact[];
  clientId: string | null;
};

export function DealContactsSection({
  dealId,
  dealContacts,
  clientContacts,
  clientId,
}: Props) {
  const [adding, setAdding] = useState(false);

  const contactMap = new Map(clientContacts.map((c) => [c.id, c]));
  const registeredContactIds = new Set(dealContacts.map((dc) => dc.contactId));

  const availableContacts = clientContacts.filter(
    (c) => !registeredContactIds.has(c.id)
  );
  const canAdd = !!clientId && availableContacts.length > 0;

  return (
    <div>
      {dealContacts.length > 0 ? (
        <div className="space-y-1">
          {dealContacts.map((dc) => {
            const contact = contactMap.get(dc.contactId);
            return (
              <div key={dc.id} className="flex items-center gap-2">
                <span className="text-xs text-text flex-1">{contact?.name ?? "-"}</span>
                <span className="text-2xs bg-bg-surface-alt px-1.5 py-0.5 rounded text-text-muted">
                  {dealContactRoleLabels[dc.role] ?? dc.role}
                </span>
                <form
                  action={async (formData: FormData) => {
                    await removeDealContactAction(dealId, formData);
                  }}
                  onKeyDown={preventEnterSubmit}
                >
                  <input type="hidden" name="contactId" value={dc.contactId} />
                  <button
                    type="submit"
                    className="text-danger underline text-xs"
                  >
                    削除
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      ) : (
        !adding && (
          <p className="text-xs text-text-muted">担当者が登録されていません</p>
        )
      )}

      {/* 追加導線: 普段はCTAボタン、押すとインラインフォームを開く */}
      {canAdd && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-2 text-xs text-primary underline cursor-pointer"
        >
          + 担当者を追加
        </button>
      )}

      {canAdd && adding && (
        <form
          action={async (formData: FormData) => {
            await addDealContactAction(dealId, formData);
            setAdding(false);
          }}
          onKeyDown={preventEnterSubmit}
          className="mt-3 flex gap-2 items-end"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">担当者</label>
            <select
              name="contactId"
              className="text-xs border border-border bg-bg-surface text-text px-2 py-1 rounded"
              required
            >
              <option value="">選択してください</option>
              {availableContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.department ? ` (${c.department})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">ロール</label>
            <select
              name="role"
              className="text-xs border border-border bg-bg-surface text-text px-2 py-1 rounded"
              required
            >
              <option value="">選択してください</option>
              {Object.entries(dealContactRoleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="text-xs bg-primary text-white px-3 py-1 rounded"
          >
            追加
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-xs text-text-muted underline"
          >
            キャンセル
          </button>
        </form>
      )}

      {clientId && availableContacts.length === 0 && clientContacts.length > 0 && (
        <p className="text-xs text-text-muted mt-2">追加できる担当者はいません</p>
      )}
    </div>
  );
}
