"use client";

import { useActionState } from "react";
import { createWebhookEndpointAction } from "@/app/actions/webhooks";
import { WEBHOOK_EVENT_TYPES } from "@/domain/models/webhookEvent";
import { BTN_PRIMARY, INPUT_BASE } from "../../styles";

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
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-green-800">エンドポイントを作成しました。</p>
          <p className="mt-1 text-xs text-green-700">
            Secret:{" "}
            <code className="font-mono bg-green-100 px-1 py-0.5 rounded">
              {state.endpoint.secret}
            </code>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            ※ Secret はこのページのリロード後に確認できなくなります。今すぐ保存してください。
          </p>
        </div>
      )}
      {state?.success === false && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{state.message}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            id="url"
            name="url"
            type="text"
            placeholder="https://example.com/webhook"
            className={`mt-1 block ${INPUT_BASE}`}
            required
          />
        </div>
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">
            購読するイベント <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {WEBHOOK_EVENT_TYPES.map((eventType) => (
              <label key={eventType} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="events"
                  value={eventType}
                  className="rounded border-gray-300"
                />
                <span className="font-mono text-xs">{eventType}</span>
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className={`${BTN_PRIMARY} disabled:opacity-50`}
        >
          {pending ? "作成中..." : "エンドポイントを追加"}
        </button>
        <p className="text-xs text-gray-500">
          ※ Secret は作成時のみ全文が表示されます。ページをリロードすると確認できなくなります。
        </p>
      </form>
    </div>
  );
}
