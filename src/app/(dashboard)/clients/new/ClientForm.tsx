"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientAction } from "@/app/actions/clients";
import { FormField, Input, Textarea, SubmitButton, preventEnterSubmit } from "@/app/components";
import { useToast } from "@/app/components";

type Contact = {
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  isPrimary: boolean;
};

const emptyContact = (): Contact => ({
  name: "",
  department: "",
  position: "",
  email: "",
  phone: "",
  isPrimary: false,
});

export function ClientForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [state, formAction, isPending] = useActionState(
    async (prev: Parameters<typeof createClientAction>[0], formData: FormData) => {
      // contacts を JSON として埋め込む
      formData.set("contacts", JSON.stringify(contacts));
      const result = await createClientAction(prev, formData);
      if (!result.errors && !result.message) {
        showToast("顧客を登録しました", "success");
        router.push("/clients");
      }
      return result;
    },
    {}
  );

  function addContact() {
    setContacts((prev) => [...prev, emptyContact()]);
  }

  function removeContact(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateContact(index: number, field: keyof Contact, value: string | boolean) {
    setContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  }

  return (
    <form action={formAction} onKeyDown={preventEnterSubmit} className="bg-bg-surface border border-border border-t-0 p-4">
      {state.message && (
        <p className="text-danger text-xs mb-3">{state.message}</p>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
        <FormField label="企業名" htmlFor="name" required error={state.errors?.name?.[0]}>
          <Input id="name" name="name" required placeholder="株式会社○○" />
        </FormField>

        <FormField label="業種" htmlFor="industry" error={state.errors?.industry?.[0]}>
          <Input id="industry" name="industry" placeholder="IT・ソフトウェア" />
        </FormField>

        <FormField label="企業規模" htmlFor="size" error={state.errors?.size?.[0]}>
          <Input id="size" name="size" placeholder="中堅（100〜999名）" />
        </FormField>

        <FormField label="所在地" htmlFor="address" error={state.errors?.address?.[0]}>
          <Input id="address" name="address" placeholder="東京都千代田区..." />
        </FormField>
      </div>

      <FormField label="備考" htmlFor="notes" error={state.errors?.notes?.[0]}>
        <Textarea id="notes" name="notes" rows={3} placeholder="自由記述" />
      </FormField>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-text">担当者</span>
          <button
            type="button"
            onClick={addContact}
            className="text-xs text-primary underline"
          >
            + 担当者を追加
          </button>
        </div>

        {contacts.length === 0 && (
          <p className="text-xs text-text-muted">担当者は省略可能です</p>
        )}

        {contacts.map((contact, i) => (
          <div key={i} className="border border-border-light p-3 mb-2 bg-bg-surface-alt">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">担当者 {i + 1}</span>
              <button
                type="button"
                onClick={() => removeContact(i)}
                className="text-xs text-danger underline"
              >
                削除
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <FormField label="氏名" htmlFor={`contact_name_${i}`} required>
                <Input
                  id={`contact_name_${i}`}
                  value={contact.name}
                  onChange={(e) => updateContact(i, "name", e.target.value)}
                  placeholder="山田 太郎"
                />
              </FormField>
              <FormField label="部署" htmlFor={`contact_department_${i}`}>
                <Input
                  id={`contact_department_${i}`}
                  value={contact.department}
                  onChange={(e) => updateContact(i, "department", e.target.value)}
                  placeholder="営業部"
                />
              </FormField>
              <FormField label="役職" htmlFor={`contact_position_${i}`}>
                <Input
                  id={`contact_position_${i}`}
                  value={contact.position}
                  onChange={(e) => updateContact(i, "position", e.target.value)}
                  placeholder="部長"
                />
              </FormField>
              <FormField label="メール" htmlFor={`contact_email_${i}`}>
                <Input
                  id={`contact_email_${i}`}
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(i, "email", e.target.value)}
                  placeholder="taro@example.com"
                />
              </FormField>
              <FormField label="電話" htmlFor={`contact_phone_${i}`}>
                <Input
                  id={`contact_phone_${i}`}
                  value={contact.phone}
                  onChange={(e) => updateContact(i, "phone", e.target.value)}
                  placeholder="03-0000-0000"
                />
              </FormField>
              <FormField label="主担当者" htmlFor={`contact_primary_${i}`}>
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input
                    id={`contact_primary_${i}`}
                    type="checkbox"
                    checked={contact.isPrimary}
                    onChange={(e) => updateContact(i, "isPrimary", e.target.checked)}
                  />
                  主担当者にする
                </label>
              </FormField>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <SubmitButton pending={isPending}>登録する</SubmitButton>
        <Link href="/clients" className="text-xs text-text-muted underline self-center">
          キャンセル
        </Link>
      </div>
    </form>
  );
}
