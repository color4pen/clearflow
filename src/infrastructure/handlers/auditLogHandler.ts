import { auditLogRepository } from "@/infrastructure/repositories";
import type { Transaction } from "@/infrastructure/db";
import type { DomainEvent, DispatchOptions } from "@/domain/events";

export async function handleAuditLog(event: DomainEvent, options?: DispatchOptions): Promise<void> {
  if (event.type !== "request.submitted") {
    return;
  }

  const tx = options?.tx as Transaction | undefined;

  await auditLogRepository.create(
    {
      action: "request.submit",
      targetType: "request",
      targetId: event.payload.requestId,
      actorId: event.actorId,
      organizationId: event.organizationId,
      metadata: null,
    },
    tx
  );
}
