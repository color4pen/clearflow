"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createRequestAction,
  type CreateRequestState,
} from "@/app/actions/requests";
import {
  PageToolbar,
  SectionCard,
  FormField,
  Input,
  Textarea,
  SubmitButton,
} from "@/app/components";

const initialState: CreateRequestState = {};

export default function NewRequestPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createRequestAction,
    initialState
  );

  useEffect(() => {
    // Redirect on success (no errors, no message, and state has been touched)
    if (
      state !== initialState &&
      !state.errors &&
      !state.message
    ) {
      router.push("/requests");
    }
  }, [state, router]);

  return (
    <div>
      <div className="mb-2">
        <PageToolbar title="新規申請" />
      </div>

      <SectionCard className="p-4">
        {state.message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-danger text-xs">
            {state.message}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <FormField
            label={<>タイトル <span className="text-red-500">*</span></>}
            htmlFor="title"
            error={state.errors?.title?.[0]}
          >
            <Input
              id="title"
              name="title"
              type="text"
              required
              placeholder="申請のタイトルを入力"
            />
          </FormField>

          <FormField
            label="説明（任意）"
            htmlFor="description"
            error={state.errors?.description?.[0]}
          >
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="申請の詳細を入力（任意）"
            />
          </FormField>

          <FormField
            label="金額（任意）"
            htmlFor="amount"
            error={state.errors?.amount?.[0]}
          >
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0}
              step={1}
              placeholder="金額を入力（任意）"
            />
          </FormField>

          <div className="flex items-center gap-3 pt-1">
            <SubmitButton pending={isPending} pendingText="作成中...">
              申請を作成
            </SubmitButton>
            <Link
              href="/requests"
              className="text-xs text-text-muted underline"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
