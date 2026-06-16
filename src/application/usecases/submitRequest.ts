import { requestRepository, auditLogRepository } from "@/infrastructure/repositories";
import { validateTransition } from "@/domain/services/requestTransition";
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

  const updated = await requestRepository.updateStatus(
    data.requestId,
    data.organizationId,
    "pending",
    new Date()
  );
  if (!updated) {
    return { ok: false, reason: "Failed to update request." };
  }

  await auditLogRepository.create({
    action: "request.submit",
    targetType: "request",
    targetId: data.requestId,
    actorId: data.actorId,
    organizationId: data.organizationId,
  });

  return { ok: true, request: updated };
}
