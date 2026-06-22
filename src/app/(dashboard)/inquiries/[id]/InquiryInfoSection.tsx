"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  const save = useCallback(async () => {
    if (!formRef.current) return;
    setSaveStatus("saving");
    const formData = new FormData(formRef.current);
    if (inquiry.clientId) formData.set("clientId", inquiry.clientId);
    if (inquiry.assigneeId) formData.set("assigneeId", inquiry.assigneeId);

    const result = await updateInquiryAction(inquiry.id, {}, formData);
    if (result.success === false || result.message) {
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      router.refresh();
    }
  }, [inquiry.id, inquiry.clientId, inquiry.assigneeId, router]);

  const debouncedSave = useDebouncedCallback(save, 800);

  const handleSelectChange = useCallback(() => {
    save();
  }, [save]);

  return (
    <form ref={formRef} onKeyDown={preventEnterSubmit}>
      {saveStatus !== "idle" && (
        <div className="flex justify-end mb-1">
          {saveStatus === "saving" && <span className="text-text-muted text-xs">保存中...</span>}
          {saveStatus === "saved" && <span className="text-green-600 text-xs">保存済み</span>}
          {saveStatus === "error" && <span className="text-danger text-xs">保存に失敗しました</span>}
        </div>
      )}
      <div className="flex gap-2">
        <dt className="text-text-muted w-20 shrink-0">件名</dt>
        <dd className="text-text flex-1">
          <Input name="title" defaultValue={inquiry.title} disabled={!editable} onChange={() => debouncedSave()} />
        </dd>
      </div>
      <div className="flex gap-2 mt-1">
        <dt className="text-text-muted w-20 shrink-0">流入経路</dt>
        <dd className="text-text flex-1">
          <Select name="source" defaultValue={inquiry.source} disabled={!editable} onChange={handleSelectChange}>
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
            onChange={() => debouncedSave()}
          />
        </dd>
      </div>
    </form>
  );
}
