"use client";

import { useActionState } from "react";
import { createWebhookEndpointAction } from "@/app/actions/webhooks";
import { WEBHOOK_EVENT_TYPES } from "@/domain/models/webhookEvent";
import { FormField, Input, SubmitButton } from "@/app/components";

type ActionState =
  | null
  | { success: false; message: string }
  | {
      success: true;
      endpoint: {
        id: string;
        url: string;
        secret: string;
        isActive: boolean;
        events: string[];
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
      };
    };

async function createAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = await createWebhookEndpointAction(formData);
  if (!result.success) {
    return { success: false, message: result.message ?? "エラーが発生しました" };
  }
  return {
    success: true,
    endpoint: result.endpoint as NonNullable<typeof result.endpoint>,
  };
}

export function WebhookCreateForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createAction,
    null
  );

  return (
    <div>
      {state?.success === true && state.endpoint && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200">
          <p className="text-xs font-bold text-green-800">エンドポイントを作成しました。</p>
          <p className="mt-1 text-xs text-green-700">
            Secret:{" "}
            <code className="bg-green-100 px-1 py-0.5 text-xs">
              {state.endpoint.secret}
            </code>
          </p>
          <p className="mt-1 text-xs text-text-muted">
            ※ Secret はこのページのリロード後に確認できなくなります。今すぐ保存してください。
          </p>
        </div>
      )}
      {state?.success === false && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200">
          <p className="text-xs text-danger">{state.message}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <FormField
          label={<>URL <span className="text-red-500">*</span></>}
          htmlFor="url"
        >
          <Input
            id="url"
            name="url"
            type="text"
            placeholder="https://example.com/webhook"
            className="mt-1 block"
            required
          />
        </FormField>
        <div>
          <p className="block text-xs font-bold text-text mb-2">
            購読するイベント <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {WEBHOOK_EVENT_TYPES.map((eventType) => (
              <label key={eventType} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  name="events"
                  value={eventType}
                  className="border-border"
                />
                <span className="text-xs">{eventType}</span>
              </label>
            ))}
          </div>
        </div>
        <SubmitButton pending={pending} pendingText="作成中...">
          エンドポイントを追加
        </SubmitButton>
        <p className="text-xs text-text-muted">
          ※ Secret は作成時のみ全文が表示されます。ページをリロードすると確認できなくなります。
        </p>
      </form>
    </div>
  );
}
