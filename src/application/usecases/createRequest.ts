import { requestRepository, auditLogRepository } from "@/infrastructure/repositories";
import type { Request } from "@/domain/models/request";

export async function createRequest(data: {
  title: string;
  description?: string | null;
  organizationId: string;
  creatorId: string;
}): Promise<Request> {
  const request = await requestRepository.create({
    title: data.title,
    description: data.description ?? null,
    organizationId: data.organizationId,
    creatorId: data.creatorId,
  });

  await auditLogRepository.create({
    action: "request.create",
    targetType: "request",
    targetId: request.id,
    actorId: data.creatorId,
    organizationId: data.organizationId,
  });

  return request;
}
