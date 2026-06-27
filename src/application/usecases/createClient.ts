import { clientRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { Client } from "@/domain/models/client";

export type CreateClientResult =
  | { ok: true; client: Client }
  | { ok: false; reason: string };

export async function createClient(data: {
  name: string;
  organizationId: string;
  actorId: string;
  industry?: string | null;
  size?: string | null;
  address?: string | null;
  notes?: string | null;
  contacts?: Array<{
    name: string;
    department?: string | null;
    position?: string | null;
    email?: string | null;
    phone?: string | null;
    isPrimary?: boolean;
  }>;
}): Promise<CreateClientResult> {
  try {
    const client = await db.transaction(async (tx) => {
      const newClient = await clientRepository.create(
        {
          name: data.name,
          organizationId: data.organizationId,
          industry: data.industry,
          size: data.size,
          address: data.address,
          notes: data.notes,
        },
        tx
      );

      if (data.contacts && data.contacts.length > 0) {
        for (const contact of data.contacts) {
          await clientRepository.createContact(
            {
              clientId: newClient.id,
              name: contact.name,
              department: contact.department,
              position: contact.position,
              email: contact.email,
              phone: contact.phone,
              isPrimary: contact.isPrimary,
            },
            tx
          );
        }
      }

      await recordAudit(
        {
          action: "client.create",
          targetType: "client",
          targetId: newClient.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );

      return newClient;
    });

    return { ok: true, client };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "顧客の作成に失敗しました",
    };
  }
}
