"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, Suspense } from "react";
import { createDealAction } from "@/app/actions/deals";
import { PageToolbar, FormField, Input, SectionCard } from "@/app/components";
import Link from "next/link";
import type { CreateDealState } from "@/app/actions/deals";

const initialState: CreateDealState = {};

function NewDealForm() {
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId") ?? "";
  const [state, formAction, isPending] = useActionState(createDealAction, initialState);

  return (
    <form action={formAction}>
      <SectionCard className="p-4">
        {state.message && <p className="text-danger text-xs mb-2">{state.message}</p>}

        <input type="hidden" name="inquiryId" value={inquiryId} />

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
          <Link href={`/inquiries/${inquiryId}`} className="text-xs text-text-muted underline">
            キャンセル
          </Link>
        </div>
      </SectionCard>
    </form>
  );
}

export default function NewDealPage() {
  return (
    <div>
      <PageToolbar title="案件を作成" />
      <div className="mt-2">
        <Suspense fallback={<div className="text-xs text-text-muted">読み込み中...</div>}>
          <NewDealForm />
        </Suspense>
      </div>
    </div>
  );
}
