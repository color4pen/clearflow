import { requestRepository, auditLogRepository } from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
import type { Request } from "@/domain/models/request";

export type RejectRequestResult =
  | { ok: true; request: Request }
  | { ok: false; reason: string };

export async function rejectRequest(data: {
  requestId: string;
  organizationId: string;
  actorId: string;
}): Promise<RejectRequestResult> {
  const existing = await requestRepository.findById(
    data.requestId,
    data.organizationId
  );
  if (!existing) {
    return { ok: false, reason: "Request not found." };
  }

  const validation = validateTransition(existing.status, "rejected");
  if (!validation.ok) {
    return { ok: false, reason: validation.reason };
  }

  const updated = await requestRepository.updateStatus(
    data.requestId,
    data.organizationId,
    "rejected",
    new Date()
  );
  if (!updated) {
    return { ok: false, reason: "Failed to update request." };
  }

  await auditLogRepository.create({
    action: "request.reject",
    targetType: "request",
    targetId: data.requestId,
    actorId: data.actorId,
    organizationId: data.organizationId,
  });

  return { ok: true, request: updated };
}
