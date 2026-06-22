"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateInquiryAction } from "@/app/actions/inquiries";
import type { UpdateInquiryState } from "@/app/actions/inquiries";
import { SectionCard, FormField, Input, Select, Textarea, SubmitButton } from "@/app/components";
import type { Client } from "@/domain/models/client";

type Props = {
  inquiry: {
    id: string;
    title: string;
    description: string | null;
    source: string;
    clientId: string | null;
    assigneeId: string | null;
  };
  clients: Client[];
  users: { id: string; name: string }[];
};

export function EditInquiryForm({ inquiry, clients, users }: Props) {
  const router = useRouter();
  const boundAction = updateInquiryAction.bind(null, inquiry.id);
  const [state, formAction] = useActionState<UpdateInquiryState, FormData>(boundAction, {});

  useEffect(() => {
    if (state.success) {
      router.push(`/inquiries/${inquiry.id}`);
    }
  }, [state.success, inquiry.id, router]);

  return (
    <form action={formAction}>
      <SectionCard className="p-3">
        {state.message && (
          <p className="text-danger text-xs mb-2">{state.message}</p>
        )}

        <FormField label="件名" error={state.errors?.title?.[0]}>
          <Input name="title" defaultValue={inquiry.title} required />
        </FormField>

        <FormField label="顧客" error={state.errors?.clientId?.[0]}>
          <Select name="clientId" defaultValue={inquiry.clientId ?? ""}>
            <option value="">未定</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="流入経路" error={state.errors?.source?.[0]}>
          <Select name="source" defaultValue={inquiry.source} required>
            <option value="web">Web</option>
            <option value="phone">電話</option>
            <option value="referral">紹介</option>
            <option value="exhibition">展示会</option>
            <option value="other">その他</option>
          </Select>
        </FormField>

        <FormField label="社内担当者" error={state.errors?.assigneeId?.[0]}>
          <Select name="assigneeId" defaultValue={inquiry.assigneeId ?? ""}>
            <option value="">未定</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="内容" error={state.errors?.description?.[0]}>
          <Textarea name="description" defaultValue={inquiry.description ?? ""} rows={6} />
        </FormField>

        <div className="flex gap-2 mt-3">
          <SubmitButton>保存</SubmitButton>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-xs text-text-muted underline cursor-pointer"
          >
            キャンセル
          </button>
        </div>
      </SectionCard>
    </form>
  );
}
