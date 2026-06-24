import { requestRepository } from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
import { db } from "@/infrastructure/db";
import { dispatcher } from "@/domain/events";
import type { Request } from "@/domain/models/request";

const OPTIMISTIC_LOCK_ERROR = "この申請は他のユーザーによって更新されました。画面を更新してください";

export type SubmitRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function submitRequest(data: {
  requestId: string;
  organizationId: string;
  actorId: string;
}): Promise<SubmitRequestResult> {
  return dispatcher.runInContext(async () => {
    const existing = await requestRepository.findById(
      data.requestId,
      data.organizationId
    );
    if (!existing) {
      return { ok: false, reason: "Request not found." };
    }

    const validation = validateTransition(existing.status, "pending");
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    try {
      const updated = await db.transaction(async (tx) => {
        const result = await requestRepository.updateStatus(
          data.requestId,
          data.organizationId,
          "pending",
          new Date(),
          existing.version,
          tx
        );
        if (!result) {
          throw new Error(OPTIMISTIC_LOCK_ERROR);
        }

        await dispatcher.dispatch({
          type: "request.submitted",
          organizationId: data.organizationId,
          actorId: data.actorId,
          occurredAt: new Date(),
          payload: {
            requestId: result.id,
            requestTitle: result.title,
            status: "pending",
          },
        }, { tx });

        return result;
      });

      dispatcher.flushAsync();
      return { ok: true, request: updated };
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : "Failed to update request.",
      };
    }
  });
}
