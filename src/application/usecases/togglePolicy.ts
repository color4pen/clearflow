import {
  approvalPolicyRepository,
} from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";

import { db } from "@/infrastructure/db";
import type { ApprovalPolicy } from "@/domain/models/approvalPolicy";

export type TogglePolicyResult =
  | { ok: true; policy: ApprovalPolicy }
  | { ok: false; reason: string };

export async function togglePolicy(data: {
  id: string;
  organizationId: string;
  actorId: string;
}): Promise<TogglePolicyResult> {
  const current = await approvalPolicyRepository.findById(
    data.id,
    data.organizationId
  );
  if (!current) {
    return { ok: false, reason: "ポリシーが見つかりません" };
  }

  const newIsActive = !current.isActive;

  try {
    const policy = await db.transaction(async (tx) => {
      const p = await approvalPolicyRepository.updateById(
        data.id,
        data.organizationId,
        { isActive: newIsActive },
        tx
      );

      if (!p) return null;

      await recordAudit(
        {
          action: newIsActive ? "policy.activate" : "policy.deactivate",
          targetType: "approvalPolicy",
          targetId: data.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
          metadata: { name: current.name, isActive: newIsActive },
        },
        tx
      );

      return p;
    });

    if (!policy) {
      return { ok: false, reason: "ポリシーの更新に失敗しました" };
    }

    return { ok: true, policy };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "ポリシーの切り替えに失敗しました",
    };
  }
}
