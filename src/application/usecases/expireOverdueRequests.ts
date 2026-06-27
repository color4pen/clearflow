import {
  requestRepository,
  approvalStepRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { validateTransition } from "@/domain/services/requestTransition";
import { db } from "@/infrastructure/db";

export type ExpireOverdueRequestsResult =
  | {
      ok: true;
      expired: number;
      failed: number;
      errors: Array<{ requestId: string; reason: string }>;
    }
  | { ok: false; reason: string };

export async function expireOverdueRequests(): Promise<ExpireOverdueRequestsResult> {
  const systemUserId = process.env.SYSTEM_USER_ID;
  if (!systemUserId) {
    return { ok: false, reason: "SYSTEM_USER_ID is not set" };
  }

  const overdueItems = await approvalStepRepository.findOverdueRequestIds();

  let expired = 0;
  let failed = 0;
  const errors: Array<{ requestId: string; reason: string }> = [];

  for (const item of overdueItems) {
    try {
      await db.transaction(async (tx) => {
        const existing = await requestRepository.findById(
          item.requestId,
          item.organizationId,
          tx
        );
        if (!existing) {
          throw new Error("Request not found.");
        }

        const validation = validateTransition(existing.status, "expired");
        if (!validation.ok) {
          throw new Error(validation.reason);
        }

        const result = await requestRepository.updateStatus(
          item.requestId,
          item.organizationId,
          "expired",
          new Date(),
          existing.version,
          tx
        );
        if (!result) {
          throw new Error(
            "この申請は他のユーザーによって更新されました。画面を更新してください"
          );
        }

        await recordAudit(
          {
            action: "request.expire",
            targetType: "request",
            targetId: item.requestId,
            actorId: systemUserId,
            organizationId: item.organizationId,
          },
          tx
        );
      });
      expired++;
    } catch (err) {
      failed++;
      errors.push({
        requestId: item.requestId,
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { ok: true, expired, failed, errors };
}
