import { requestRepository, auditLogRepository } from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
import { db } from "@/infrastructure/db";
import type { Request } from "@/domain/models/request";

export type ApproveRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function approveRequest(data: {
  requestId: string;
  organizationId: string;
  actorId: string;
}): Promise<ApproveRequestResult> {
  const existing = await requestRepository.findById(
    data.requestId,
    data.organizationId
  );
  if (!existing) {
    return { ok: false, reason: "Request not found." };
  }

  const validation = validateTransition(existing.status, "approved");
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const result = await requestRepository.updateStatus(
        data.requestId,
        data.organizationId,
        "approved",
        new Date(),
        tx
      );
      if (!result) {
        throw new Error("Failed to update request.");
      }

      await auditLogRepository.create(
        {
          action: "request.approve",
          targetType: "request",
          targetId: data.requestId,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return result;
    });

    return { ok: true, request: updated };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Failed to update request.",
    };
  }
}
