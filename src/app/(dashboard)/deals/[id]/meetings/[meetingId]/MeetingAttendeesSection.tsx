"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMeetingAction } from "@/app/actions/meetings";
import { SectionCard, Input, Select, preventEnterSubmit } from "@/app/components";
import type { MeetingAttendee } from "@/domain/models/meeting";

type Props = {
  meetingId: string;
  dealId: string;
  attendees: MeetingAttendee[];
  editable: boolean;
  orgUsers?: Array<{ id: string; name: string }>;
  existingContacts?: Array<{ id: string; name: string }>;
  clientId?: string | null;
};

export function MeetingAttendeesSection({
  meetingId,
  dealId,
  attendees,
  editable,
  orgUsers = [],
  existingContacts = [],
  clientId,
}: Props) {
  const router = useRouter();

  const internalNames = attendees.filter((a) => !a.isExternal).map((a) => a.name);
  const externalNames = attendees.filter((a) => a.isExternal).map((a) => a.name);

  const [internalAttendees, setInternalAttendees] = useState<string[]>(
    internalNames.length > 0 ? [...internalNames] : [""]
  );
  const [externalAttendees, setExternalAttendees] = useState<
    Array<{ name: string; registerAsContact: boolean }>
  >(
    externalNames.length > 0
      ? externalNames.map((name) => ({ name, registerAsContact: false }))
      : [{ name: "", registerAsContact: false }]
  );

  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function markDirty() {
    setIsDirty(true);
  }

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("meetingId", meetingId);
    formData.set("dealId", dealId);
    formData.set(
      "internalAttendees",
      JSON.stringify(internalAttendees.filter((a) => a.trim()))
    );
    const filteredExternal = externalAttendees.filter((a) => a.name.trim());
    formData.set(
      "externalAttendees",
      JSON.stringify(filteredExternal.map((a) => a.name))
    );
    formData.set(
      "registerContacts",
      JSON.stringify(
        filteredExternal
          .filter((a) => a.registerAsContact)
          .map((a) => ({ name: a.name, register: a.registerAsContact }))
      )
    );
    if (clientId) {
      formData.set("clientId", clientId);
    }

    const result = await updateMeetingAction({}, formData);
    const success = !result.message && !result.errors;
    setIsSubmitting(false);

    if (success) {
      setIsDirty(false);
      router.refresh();
    } else {
      setError(result.message ?? "保存に失敗しました");
    }
  }

  function addInternalAttendee() {
    setInternalAttendees((prev) => [...prev, ""]);
    markDirty();
  }

  function removeInternalAttendee(idx: number) {
    setInternalAttendees((prev) => prev.filter((_, i) => i !== idx));
    markDirty();
  }

  function addExternalAttendee() {
    setExternalAttendees((prev) => [...prev, { name: "", registerAsContact: false }]);
    markDirty();
  }

  function removeExternalAttendee(idx: number) {
    setExternalAttendees((prev) => prev.filter((_, i) => i !== idx));
    markDirty();
  }

  return (
    <form onKeyDown={preventEnterSubmit}>
      <SectionCard className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-text">出席者</h2>
          <div className="flex items-center gap-2">
            {error && <span className="text-danger text-xs">{error}</span>}
            {editable && (
              <button
                type="button"
                disabled={!isDirty || isSubmitting}
                onClick={handleSave}
                className={`text-xs font-bold px-3 py-1 ${
                  isDirty
                    ? "bg-green-600 text-white cursor-pointer"
                    : "bg-bg-toolbar border border-border text-text-muted cursor-not-allowed"
                } disabled:opacity-50`}
              >
                {isSubmitting ? "保存中..." : "保存"}
              </button>
            )}
          </div>
        </div>
        <div className="text-xs space-y-2">
          <div>
            <p className="text-text-muted font-bold mb-0.5">社内</p>
            {editable && orgUsers.length > 0 && (
              <div className="mb-1">
                <Select
                  value=""
                  onChange={(e) => {
                    const user = orgUsers.find((u) => u.id === e.target.value);
                    if (user && !internalAttendees.includes(user.name)) {
                      setInternalAttendees((prev) => [
                        ...prev.filter((a) => a.trim()),
                        user.name,
                        "",
                      ]);
                      markDirty();
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">ユーザーから追加...</option>
                  {orgUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {internalAttendees.map((attendee, idx) => (
              <div key={idx} className="flex gap-1 mb-1">
                <Input
                  value={attendee}
                  onChange={(e) => {
                    setInternalAttendees((prev) =>
                      prev.map((a, i) => (i === idx ? e.target.value : a))
                    );
                    markDirty();
                  }}
                  placeholder="氏名"
                  disabled={!editable}
                />
                {editable && internalAttendees.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInternalAttendee(idx)}
                    className="text-xs text-danger underline whitespace-nowrap"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button
                type="button"
                onClick={addInternalAttendee}
                className="text-xs text-primary underline"
              >
                + 追加
              </button>
            )}
          </div>
          <div>
            <p className="text-text-muted font-bold mb-0.5">外部</p>
            {editable && existingContacts.length > 0 && (
              <div className="mb-1">
                <Select
                  value=""
                  onChange={(e) => {
                    const contact = existingContacts.find(
                      (c) => c.id === e.target.value
                    );
                    if (
                      contact &&
                      !externalAttendees.some((a) => a.name === contact.name)
                    ) {
                      setExternalAttendees((prev) => [
                        ...prev.filter((a) => a.name.trim()),
                        { name: contact.name, registerAsContact: false },
                        { name: "", registerAsContact: false },
                      ]);
                      markDirty();
                    }
                    e.target.value = "";
                  }}
                >
                  <option value="">顧客担当者から追加...</option>
                  {existingContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {externalAttendees.map((attendee, idx) => (
              <div key={idx} className="mb-1">
                <div className="flex gap-1">
                  <Input
                    value={attendee.name}
                    onChange={(e) => {
                      setExternalAttendees((prev) =>
                        prev.map((a, i) =>
                          i === idx ? { ...a, name: e.target.value } : a
                        )
                      );
                      markDirty();
                    }}
                    placeholder="氏名"
                    disabled={!editable}
                  />
                  {editable && externalAttendees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeExternalAttendee(idx)}
                      className="text-xs text-danger underline whitespace-nowrap"
                    >
                      削除
                    </button>
                  )}
                </div>
                {editable && clientId && attendee.name.trim() && (
                  <label className="flex items-center gap-1 mt-0.5 text-xs text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attendee.registerAsContact}
                      onChange={() => {
                        setExternalAttendees((prev) =>
                          prev.map((a, i) =>
                            i === idx
                              ? { ...a, registerAsContact: !a.registerAsContact }
                              : a
                          )
                        );
                        markDirty();
                      }}
                      className="cursor-pointer"
                    />
                    顧客担当者として登録
                  </label>
                )}
              </div>
            ))}
            {editable && (
              <button
                type="button"
                onClick={addExternalAttendee}
                className="text-xs text-primary underline"
              >
                + 追加
              </button>
            )}
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
