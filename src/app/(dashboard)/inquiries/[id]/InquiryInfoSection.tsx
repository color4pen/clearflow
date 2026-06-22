"use client";

import { useRouter } from "next/navigation";
import { updateInquiryAction } from "@/app/actions/inquiries";
import { InlineEditText, InlineEditTextarea, InlineEditSelect } from "@/app/components";
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

const sourceOptions = Object.entries(sourceLabels).map(([value, label]) => ({ value, label }));

export function InquiryInfoSection({ inquiry, editable }: Props) {
  const router = useRouter();

  function buildBaseFormData(): FormData {
    // updateInquiryAction requires title and source at minimum
    const fd = new FormData();
    fd.set("title", inquiry.title);
    fd.set("source", inquiry.source);
    if (inquiry.description) fd.set("description", inquiry.description);
    if (inquiry.clientId) fd.set("clientId", inquiry.clientId);
    if (inquiry.assigneeId) fd.set("assigneeId", inquiry.assigneeId);
    return fd;
  }

  async function saveName(newValue: string) {
    const fd = buildBaseFormData();
    fd.set("title", newValue);
    const result = await updateInquiryAction(inquiry.id, {}, fd);
    if (result.success) router.refresh();
    return { success: result.success === true, message: result.message };
  }

  async function saveSource(newValue: string) {
    const fd = buildBaseFormData();
    fd.set("source", newValue);
    const result = await updateInquiryAction(inquiry.id, {}, fd);
    if (result.success) router.refresh();
    return { success: result.success === true, message: result.message };
  }

  async function saveDescription(newValue: string) {
    const fd = buildBaseFormData();
    fd.set("description", newValue);
    const result = await updateInquiryAction(inquiry.id, {}, fd);
    if (result.success) router.refresh();
    return { success: result.success === true, message: result.message };
  }

  return (
    <>
      <div className="flex gap-2">
        <dt className="text-text-muted w-20 shrink-0">件名</dt>
        <dd className="text-text flex-1">
          <InlineEditText
            value={inquiry.title}
            onSave={saveName}
            editable={editable}
            placeholder="件名を入力"
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-20 shrink-0">流入経路</dt>
        <dd className="text-text flex-1">
          <InlineEditSelect
            value={inquiry.source}
            options={sourceOptions}
            onSave={saveSource}
            editable={editable}
          />
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-text-muted w-20 shrink-0">内容</dt>
        <dd className="text-text flex-1">
          <InlineEditTextarea
            value={inquiry.description}
            onSave={saveDescription}
            editable={editable}
            placeholder="内容を入力"
            rows={4}
          />
        </dd>
      </div>
    </>
  );
}
