import { clientRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";
import type { Client } from "@/domain/models/client";

export type UpdateClientInput = Partial<{
  name: string;
  industry: string | null;
  size: string | null;
  address: string | null;
  notes: string | null;
}>;

export type UpdateClientResult =
  | { ok: true; client: Client }
  | { ok: false; reason: string };

export async function updateClient(data: {
  organizationId: string;
  clientId: string;
  data: UpdateClientInput;
  userId: string;
}): Promise<UpdateClientResult> {
  try {
    const updatedClient = await db.transaction(async (tx) => {
      const updated = await clientRepository.update(
        data.clientId,
        data.organizationId,
        data.data,
        tx
      );

      if (!updated) {
        return null;
      }

      await recordAudit(
        {
          action: "client.update",
          targetType: "client",
          targetId: data.clientId,
          actorId: data.userId,
          organizationId: data.organizationId,
        },
        tx
      );

      return updated;
    });

    if (!updatedClient) {
      return { ok: false, reason: "顧客が見つかりません" };
    }

    return { ok: true, client: updatedClient };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "顧客の更新に失敗しました",
    };
  }
}
