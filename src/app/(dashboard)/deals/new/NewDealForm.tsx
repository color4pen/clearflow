"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createDealAction } from "@/app/actions/deals";
import { FormField, Input, Select, Textarea, SectionCard, preventEnterSubmit, MoneyInput, SubmitButton } from "@/app/components";
import { useToast } from "@/app/components";
import Link from "next/link";
import type { CreateDealState } from "@/app/actions/deals";
import type { Client } from "@/domain/models/client";

type Props = {
  inquiryId: string | null;
  clients: Client[];
  users: { id: string; name: string }[];
};

const initialState: CreateDealState = {};

export function NewDealForm({ inquiryId, clients, users }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [state, formAction, isPending] = useActionState(createDealAction, initialState);
  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");

  useEffect(() => {
    if (state.dealId) {
      showToast("案件を作成しました", "success");
      router.push(`/deals/${state.dealId}`);
    }
  }, [state.dealId, router, showToast]);

  return (
    <form action={formAction} onKeyDown={preventEnterSubmit}>
      <SectionCard className="p-4">
        {state.message && <p className="text-danger text-xs mb-2">{state.message}</p>}

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {inquiryId ? (
            <input type="hidden" name="inquiryId" value={inquiryId} />
          ) : (
            <FormField label="顧客" required error={state.errors?.clientId?.[0]}>
              <select
                name="clientId"
                className="text-xs border border-border px-2 py-1 w-full"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setClientMode("new");
                  } else {
                    setClientMode("existing");
                  }
                }}
              >
                <option value="" disabled>顧客を選択してください</option>
                <option value="__new__">新規登録</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {clientMode === "new" && (
                <Input
                  name="newClientName"
                  placeholder="企業名"
                  required
                  className="mt-1"
                />
              )}
            </FormField>
          )}

          <FormField label="案件名" required error={state.errors?.title?.[0]}>
            <Input name="title" required />
          </FormField>

          <FormField label="想定金額" error={state.errors?.estimatedAmount?.[0]}>
            <MoneyInput name="estimatedAmount" />
          </FormField>

          <FormField label="想定開始日" error={state.errors?.estimatedStartDate?.[0]}>
            <Input name="estimatedStartDate" type="date" />
          </FormField>

          <FormField label="想定終了日" error={state.errors?.estimatedEndDate?.[0]}>
            <Input name="estimatedEndDate" type="date" />
          </FormField>

          <FormField label="契約種別" error={state.errors?.contractType?.[0]}>
            <Select name="contractType" defaultValue="">
              <option value="">未設定</option>
              <option value="quasi_delegation">準委任</option>
              <option value="fixed_price">請負</option>
              <option value="ses">SES</option>
            </Select>
          </FormField>

          <FormField label="営業担当" error={state.errors?.assigneeId?.[0]}>
            <Select name="assigneeId" defaultValue="">
              <option value="">未設定</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="技術担当" error={state.errors?.technicalLeadId?.[0]}>
            <Select name="technicalLeadId" defaultValue="">
              <option value="">未設定</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="col-span-2">
            <FormField label="備考" error={state.errors?.notes?.[0]}>
              <Textarea name="notes" rows={8} />
            </FormField>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <SubmitButton pending={isPending}>案件を作成</SubmitButton>
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
