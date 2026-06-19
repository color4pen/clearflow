"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createInquiryAction } from "@/app/actions/inquiries";
import { FormField, Input, Select, Textarea, SubmitButton } from "@/app/components";
import type { Client, ClientContact } from "@/domain/models/client";

type Props = {
  clients: Client[];
  contactsByClientId: Record<string, ClientContact[]>;
};

const sourceOptions = [
  { value: "", label: "選択してください" },
  { value: "web", label: "Web" },
  { value: "phone", label: "電話" },
  { value: "referral", label: "紹介" },
  { value: "exhibition", label: "展示会" },
  { value: "other", label: "その他" },
];

export function InquiryForm({ clients, contactsByClientId }: Props) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (prev: Parameters<typeof createInquiryAction>[0], formData: FormData) => {
      const result = await createInquiryAction(prev, formData);
      if (!result.errors && !result.message) {
        router.push("/inquiries");
      }
      return result;
    },
    {}
  );

  const contacts = selectedClientId ? (contactsByClientId[selectedClientId] ?? []) : [];

  return (
    <form action={formAction} className="bg-bg-surface border border-border border-t-0 p-4">
      {state.message && (
        <p className="text-danger text-xs mb-3">{state.message}</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FormField
          label={<>顧客 <span className="text-danger">*</span></>}
          htmlFor="clientId"
          error={state.errors?.clientId?.[0]}
        >
          <Select
            id="clientId"
            name="clientId"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            required
          >
            <option value="">選択してください</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="担当者"
          htmlFor="contactId"
          error={state.errors?.contactId?.[0]}
        >
          <Select id="contactId" name="contactId" disabled={contacts.length === 0}>
            <option value="">
              {contacts.length === 0 ? "（顧客を選択してください）" : "選択してください（任意）"}
            </option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.isPrimary ? " [主]" : ""}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField
          label={<>件名 <span className="text-danger">*</span></>}
          htmlFor="title"
          error={state.errors?.title?.[0]}
        >
          <Input id="title" name="title" required placeholder="引き合いの件名" />
        </FormField>

        <FormField
          label={<>流入経路 <span className="text-danger">*</span></>}
          htmlFor="source"
          error={state.errors?.source?.[0]}
        >
          <Select id="source" name="source" required>
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <div className="mt-3">
        <FormField label="概要" htmlFor="description" error={state.errors?.description?.[0]}>
          <Textarea id="description" name="description" rows={4} placeholder="引き合いの概要を記入してください" />
        </FormField>
      </div>

      <div className="mt-4 flex gap-2">
        <SubmitButton pending={isPending}>登録する</SubmitButton>
        <Link href="/inquiries" className="text-xs text-text-muted underline self-center">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
