"use client";

import { useActionState } from "react";
import { deleteTemplateAction } from "@/app/actions/templates";
import { LinkButton } from "@/app/components";

type State = null | { success: false; message: string } | { success: true };

export function DeleteButton({ templateId }: { templateId: string }) {
  const boundAction = (_prev: State, _formData: FormData) =>
    deleteTemplateAction(templateId);

  const [state, formAction, pending] = useActionState<State, FormData>(
    boundAction,
    null
  );

  return (
    <div>
      {state?.success === false && (
        <p className="text-xs text-danger mb-1">{state.message}</p>
      )}
      <form action={formAction}>
        <LinkButton variant="danger" disabled={pending} type="submit">
          {pending ? "削除中..." : "削除"}
        </LinkButton>
      </form>
    </div>
  );
}
