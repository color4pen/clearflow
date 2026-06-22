"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInquiryAction } from "@/app/actions/inquiries";
import { Input, Select, Textarea, preventEnterSubmit } from "@/app/components";
import { sourceLabels } from "@/app/(dashboard)/labels";

type Props = {
  inquiry: {
    id: string;
    title: string;
    source: string;
    description: string | null;
    clientId: string | null;
    assigneeId: string | null;
  };
  editable: boolean;
};

export function InquiryInfoSection({ inquiry, editable }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (inquiry.clientId) formData.set("clientId", inquiry.clientId);
    if (inquiry.assigneeId) formData.set("assigneeId", inquiry.assigneeId);

    const result = await updateInquiryAction(inquiry.id, {}, formData);
    setIsSubmitting(false);

    if (result.success) {
      setIsDirty(false);
      router.refresh();
    } else {
      setError(result.message ?? "保存に失敗しました");
    }
  }

  function markDirty() {
    setIsDirty(true);
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={preventEnterSubmit}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-text">引き合い情報</h2>
        <div className="flex items-center gap-2">
          {error && <span className="text-danger text-xs">{error}</span>}
          {editable && (
            <button
              type="submit"
              disabled={!isDirty || isSubmitting}
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
      <div className="flex gap-2">
        <dt className="text-text-muted w-20 shrink-0">件名</dt>
        <dd className="text-text flex-1">
          <Input name="title" defaultValue={inquiry.title} disabled={!editable} onChange={markDirty} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-20 shrink-0">流入経路</dt>
        <dd className="text-text flex-1">
          <Select name="source" defaultValue={inquiry.source} disabled={!editable} onChange={markDirty}>
            {Object.entries(sourceLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-20 shrink-0">内容</dt>
        <dd className="text-text flex-1">
          <Textarea
            name="description"
            defaultValue={inquiry.description ?? ""}
            disabled={!editable}
            rows={4}
            onChange={markDirty}
          />
        </dd>
      </div>
    </form>
  );
}
