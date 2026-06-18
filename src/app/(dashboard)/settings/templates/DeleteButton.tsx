"use client";

import { useActionState } from "react";
import { deleteTemplateAction } from "@/app/actions/templates";

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
        <p className="text-xs text-red-600 mb-1">{state.message}</p>
      )}
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="text-xs text-red-600 hover:text-red-800 border border-red-300 rounded px-2 py-0.5 hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? "削除中..." : "削除"}
        </button>
      </form>
    </div>
  );
}
