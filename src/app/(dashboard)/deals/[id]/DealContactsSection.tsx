"use client";

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
  // dealContacts と clientContacts を contactId で結合する
  const contactMap = new Map(clientContacts.map((c) => [c.id, c]));
  const registeredContactIds = new Set(dealContacts.map((dc) => dc.contactId));

  // 追加済みでない担当者のみ追加フォームに表示する
  const availableContacts = clientContacts.filter(
    (c) => !registeredContactIds.has(c.id)
  );

  return (
    <div>
      {dealContacts.length === 0 ? (
        <p className="text-xs text-text-muted">担当者が登録されていません</p>
      ) : (
        <table className="text-xs w-full">
          <thead>
            <tr className="text-text-muted border-b border-border">
              <th className="text-left py-1 pr-2">氏名</th>
              <th className="text-left py-1 pr-2">部署</th>
              <th className="text-left py-1 pr-2">役職</th>
              <th className="text-left py-1 pr-2">ロール</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {dealContacts.map((dc) => {
              const contact = contactMap.get(dc.contactId);
              return (
                <tr key={dc.id} className="border-b border-border-light">
                  <td className="py-1 pr-2 text-text">{contact?.name ?? "-"}</td>
                  <td className="py-1 pr-2 text-text">{contact?.department ?? "-"}</td>
                  <td className="py-1 pr-2 text-text">{contact?.position ?? "-"}</td>
                  <td className="py-1 pr-2 text-text">
                    {dealContactRoleLabels[dc.role] ?? dc.role}
                  </td>
                  <td className="py-1">
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* 追加フォーム（clientId が null の場合は非表示） */}
      {clientId && availableContacts.length > 0 && (
        <form
          action={async (formData: FormData) => {
            await addDealContactAction(dealId, formData);
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
        </form>
      )}

      {/* 追加可能な担当者がいない場合（全員追加済み）かつ clientId あり */}
      {clientId && availableContacts.length === 0 && clientContacts.length > 0 && (
        <p className="text-xs text-text-muted mt-2">追加できる担当者はいません</p>
      )}
    </div>
  );
}
