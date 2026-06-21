"use client";

import { useActionState } from "react";
import { createDealAction } from "@/app/actions/deals";
import { FormField, Input, SectionCard } from "@/app/components";
import Link from "next/link";
import type { CreateDealState } from "@/app/actions/deals";
import type { Client } from "@/domain/models/client";

type Props = {
  inquiryId: string | null;
  clients: Client[];
};

const initialState: CreateDealState = {};

export function NewDealForm({ inquiryId, clients }: Props) {
  const [state, formAction, isPending] = useActionState(createDealAction, initialState);

  return (
    <form action={formAction}>
      <SectionCard className="p-4">
        {state.message && <p className="text-danger text-xs mb-2">{state.message}</p>}

        {inquiryId ? (
          // 引き合い経由: hidden フィールドで inquiryId を渡す
          <input type="hidden" name="inquiryId" value={inquiryId} />
        ) : (
          // 直接作成: 顧客選択プルダウンを表示する
          <FormField label="顧客" error={state.errors?.clientId?.[0]}>
            <select
              name="clientId"
              required
              className="text-xs border border-border px-2 py-1 w-full"
              defaultValue=""
            >
              <option value="" disabled>顧客を選択してください</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <FormField label="案件名" error={state.errors?.title?.[0]}>
          <Input name="title" required />
        </FormField>

        <FormField label="想定金額" error={state.errors?.estimatedAmount?.[0]}>
          <Input name="estimatedAmount" type="number" />
        </FormField>

        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary text-white text-xs px-4 py-1.5 rounded-none cursor-pointer disabled:opacity-50"
          >
            {isPending ? "作成中..." : "案件を作成"}
          </button>
          <Link
            href={inquiryId ? `/inquiries/${inquiryId}` : "/deals"}
            className="text-xs text-text-muted underline"
          >
            キャンセル
          </Link>
        </div>
      </SectionCard>
    </form>
  );
}
