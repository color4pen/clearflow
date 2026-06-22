"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateClientAction } from "@/app/actions/clients";
import type { UpdateClientState } from "@/app/actions/clients";
import { SectionCard, FormField, Input, Textarea, SubmitButton, preventEnterSubmit } from "@/app/components";

type Props = {
  client: {
    id: string;
    name: string;
    industry: string | null;
    size: string | null;
    address: string | null;
    notes: string | null;
  };
};

export function EditClientForm({ client }: Props) {
  const router = useRouter();
  const boundAction = updateClientAction.bind(null, client.id);
  const [state, formAction] = useActionState<UpdateClientState, FormData>(boundAction, {});

  useEffect(() => {
    if (state.success) {
      router.push(`/clients/${client.id}`);
    }
  }, [state.success, client.id, router]);

  return (
    <form action={formAction} onKeyDown={preventEnterSubmit}>
      <SectionCard className="p-3">
        {state.message && (
          <p className="text-danger text-xs mb-2">{state.message}</p>
        )}

        <FormField label="顧客名" error={state.errors?.name?.[0]}>
          <Input name="name" defaultValue={client.name} required />
        </FormField>

        <FormField label="業種" error={state.errors?.industry?.[0]}>
          <Input name="industry" defaultValue={client.industry ?? ""} />
        </FormField>

        <FormField label="規模" error={state.errors?.size?.[0]}>
          <Input name="size" defaultValue={client.size ?? ""} />
        </FormField>

        <FormField label="所在地" error={state.errors?.address?.[0]}>
          <Input name="address" defaultValue={client.address ?? ""} />
        </FormField>

        <FormField label="備考" error={state.errors?.notes?.[0]}>
          <Textarea name="notes" defaultValue={client.notes ?? ""} rows={4} />
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
