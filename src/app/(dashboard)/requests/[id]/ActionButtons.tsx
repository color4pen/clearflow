"use client";

import { useFormStatus } from "react-dom";

type ServerAction = (formData: FormData) => Promise<void>;

function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {children}
    </button>
  );
}

function addIdempotencyKey(e: React.FormEvent<HTMLFormElement>) {
  const form = e.currentTarget;
  let input = form.querySelector<HTMLInputElement>('input[name="idempotencyKey"]');
  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = "idempotencyKey";
    form.appendChild(input);
  }
  input.value = crypto.randomUUID();
}

export function ActionButtons({
  requestStatus,
  submitAction,
  approveAction,
  rejectAction,
  resubmitAction,
}: {
  requestStatus: string;
  submitAction: ServerAction;
  approveAction: ServerAction;
  rejectAction: ServerAction;
  resubmitAction: ServerAction;
}) {
  if (requestStatus === "draft") {
    return (
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">アクション</h3>
        <form action={submitAction} onSubmit={addIdempotencyKey}>
          <SubmitButton className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
            提出する（審査へ）
          </SubmitButton>
        </form>
      </div>
    );
  }

  if (requestStatus === "pending") {
    return (
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">アクション</h3>
        <div className="flex gap-3 flex-wrap">
          <form action={approveAction} onSubmit={addIdempotencyKey}>
            <SubmitButton className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50">
              承認する
            </SubmitButton>
          </form>
          <form action={rejectAction} onSubmit={addIdempotencyKey}>
            <input type="hidden" name="targetStatus" value="rejected" />
            <SubmitButton className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50">
              却下する
            </SubmitButton>
          </form>
        </div>
        {/* 差し戻しフォーム */}
        <div className="mt-4">
          <form action={rejectAction} onSubmit={addIdempotencyKey} className="space-y-2">
            <input type="hidden" name="targetStatus" value="revision" />
            <div>
              <label
                htmlFor="revision-comment"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                差し戻しコメント
              </label>
              <textarea
                id="revision-comment"
                name="comment"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="差し戻し理由を入力してください"
              />
            </div>
            <SubmitButton className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50">
              差し戻す
            </SubmitButton>
          </form>
        </div>
      </div>
    );
  }

  if (requestStatus === "revision") {
    return (
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">アクション</h3>
        <form action={resubmitAction} onSubmit={addIdempotencyKey}>
          <SubmitButton className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
            再申請する
          </SubmitButton>
        </form>
      </div>
    );
  }

  return null;
}
