"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateMeetingAction } from "@/app/actions/meetings";
import { SectionCard, Input, Select, preventEnterSubmit } from "@/app/components";
import type { MeetingAttendee } from "@/domain/models/interaction";

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
  // contactId のない社外参加者（旧データ）は除外する
  const externalWithContact = attendees
    .filter((a) => a.isExternal && a.contactId !== null)
    .map((a) => ({ contactId: a.contactId!, name: a.name }));

  const [internalAttendees, setInternalAttendees] = useState<string[]>(
    internalNames.length > 0 ? [...internalNames] : [""]
  );
  const [externalAttendees, setExternalAttendees] = useState<
    Array<{ contactId: string; name: string }>
  >(externalWithContact);

  // 社内 / 社外を独立して dirty 追跡し、変更した側だけを送信する。
  // 未変更の側は FormData に含めない（= サーバ側で既存を保持する）。
  const [internalDirty, setInternalDirty] = useState(false);
  const [externalDirty, setExternalDirty] = useState(false);
  const isDirty = internalDirty || externalDirty;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function markInternalDirty() {
    setInternalDirty(true);
  }

  function markExternalDirty() {
    setExternalDirty(true);
  }

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("meetingId", meetingId);
    formData.set("dealId", dealId);
    if (internalDirty) {
      formData.set(
        "internalAttendees",
        JSON.stringify(internalAttendees.filter((a) => a.trim()))
      );
    }
    if (externalDirty) {
      formData.set(
        "externalContactIds",
        JSON.stringify(externalAttendees.map((a) => a.contactId))
      );
    }

    const result = await updateMeetingAction({}, formData);
    const success = !result.message && !result.errors;
    setIsSubmitting(false);

    if (success) {
      setInternalDirty(false);
      setExternalDirty(false);
      router.refresh();
    } else {
      const fieldError =
        result.errors?.externalContactIds?.[0] ??
        result.errors?.internalAttendees?.[0] ??
        (result.errors ? Object.values(result.errors).flat()[0] : undefined);
      setError(result.message ?? fieldError ?? "保存に失敗しました");
    }
  }

  function addInternalAttendee() {
    setInternalAttendees((prev) => [...prev, ""]);
    markInternalDirty();
  }

  function removeInternalAttendee(idx: number) {
    setInternalAttendees((prev) => prev.filter((_, i) => i !== idx));
    markInternalDirty();
  }

  function removeExternalAttendee(contactId: string) {
    setExternalAttendees((prev) => prev.filter((a) => a.contactId !== contactId));
    markExternalDirty();
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
                    ? "bg-primary text-white cursor-pointer hover:opacity-90"
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
                      markInternalDirty();
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
                    markInternalDirty();
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
            {editable && (
              <>
                {!clientId ? (
                  <p className="text-xs text-text-muted mb-1">顧客が未設定のため社外参加者を追加できません</p>
                ) : existingContacts.length === 0 ? (
                  <p className="text-xs text-text-muted mb-1">
                    担当者が登録されていません。
                    <Link href={`/clients/${clientId}`} className="text-primary underline ml-1">
                      顧客詳細で登録してください
                    </Link>
                  </p>
                ) : (
                  <div className="mb-1">
                    <Select
                      value=""
                      onChange={(e) => {
                        const contact = existingContacts.find(
                          (c) => c.id === e.target.value
                        );
                        if (
                          contact &&
                          !externalAttendees.some((a) => a.contactId === contact.id)
                        ) {
                          setExternalAttendees((prev) => [
                            ...prev,
                            { contactId: contact.id, name: contact.name },
                          ]);
                          markExternalDirty();
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
              </>
            )}
            {externalAttendees.map((attendee) => {
              // 担当者マスタから削除された contactId は氏名スナップショットのまま
              // 補足付きで表示する（行の削除はユーザーの明示操作でのみ可能）
              const isDeleted = !existingContacts.some((c) => c.id === attendee.contactId);
              return (
                <div key={attendee.contactId} className="flex gap-1 mb-1 items-center">
                  <span className="text-xs text-text flex-1">
                    {attendee.name}
                    {isDeleted && (
                      <span className="text-text-muted ml-1">（削除済み担当者）</span>
                    )}
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => removeExternalAttendee(attendee.contactId)}
                      className="text-xs text-danger underline whitespace-nowrap"
                    >
                      削除
                    </button>
                  )}
                </div>
              );
            })}
            {/* contactId のない旧データは氏名のみ表示（読み取り専用） */}
            {attendees
              .filter((a) => a.isExternal && a.contactId === null)
              .map((a, idx) => (
                <div key={`legacy-${idx}`} className="flex gap-1 mb-1 items-center">
                  <span className="text-xs text-text-muted flex-1">{a.name}</span>
                </div>
              ))}
          </div>
        </div>
      </SectionCard>
    </form>
  );
}
