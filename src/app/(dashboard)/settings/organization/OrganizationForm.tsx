"use client";

import { useActionState } from "react";
import { updateOrganizationAction } from "@/app/actions/organization";
import type { UpdateOrganizationState } from "@/app/actions/organization";
import { FormField, Input, SubmitButton } from "@/app/components";

type Props = {
  currentName: string;
};

export function OrganizationForm({ currentName }: Props) {
  const [state, formAction, pending] = useActionState<UpdateOrganizationState, FormData>(
    updateOrganizationAction,
    null
  );

  return (
    <div>
      <h2 className="text-sm font-bold text-text mb-3">組織名を編集</h2>

      {state?.success === true && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-xs text-green-800">組織名を更新しました。</p>
        </div>
      )}
      {state?.success === false && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-danger">{state.message}</p>
        </div>
      )}

      <form action={formAction} className="space-y-3">
        <FormField
          label={<>組織名 <span className="text-red-500">*</span></>}
          htmlFor="name"
        >
          <Input
            id="name"
            type="text"
            name="name"
            required
            maxLength={100}
            defaultValue={currentName}
            placeholder="組織名を入力"
          />
        </FormField>

        <SubmitButton pending={pending} pendingText="更新中...">
          保存
        </SubmitButton>
      </form>
    </div>
  );
}
