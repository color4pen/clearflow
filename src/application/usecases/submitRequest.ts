import { requestRepository, auditLogRepository } from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
import { db } from "@/infrastructure/db";
import { deliverWebhookEvent } from "@/infrastructure/webhookDelivery";
import type { Request } from "@/domain/models/request";

export type SubmitRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function submitRequest(data: {
  requestId: string;
  organizationId: string;
  actorId: string;
}): Promise<SubmitRequestResult> {
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
        tx
      );
      if (!result) {
        throw new Error("Failed to update request.");
      }

      await auditLogRepository.create(
        {
          action: "request.submit",
          targetType: "request",
          targetId: data.requestId,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return result;
    });

    void deliverWebhookEvent({
      organizationId: data.organizationId,
      event: "request.submitted",
      data: { requestId: updated.id, requestTitle: updated.title, actorId: data.actorId, status: "pending" },
    });

    return { ok: true, request: updated };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Failed to update request.",
    };
  }
}
