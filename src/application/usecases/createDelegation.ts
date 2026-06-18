import {
  approvalDelegationRepository,
  userRepository,
  auditLogRepository,
} from "@/infrastructure/repositories";
import type { ApprovalDelegation } from "@/domain/models/approvalDelegation";

export type CreateDelegationResult =
  | { ok: true; delegation: ApprovalDelegation }
  | { ok: false; reason: string };

export async function createDelegation(data: {
  fromUserId: string;
  toUserId: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  actorId: string;
}): Promise<CreateDelegationResult> {
  // 1. Self-delegation check
  if (data.fromUserId === data.toUserId) {
    return { ok: false, reason: "自己委譲は許可されていません。" };
  }

  // 2. Date validation
  if (data.startDate >= data.endDate) {
    return {
      ok: false,
      reason: "開始日は終了日より前でなければなりません。",
    };
  }

  // 3. Cross-org check: both users must belong to organizationId
  const fromUser = await userRepository.findById(
    data.fromUserId,
    data.organizationId
  );
  if (!fromUser) {
    return {
      ok: false,
      reason: "委譲元ユーザーが組織に存在しないか、異なる組織に属しています。",
    };
  }

  const toUser = await userRepository.findById(
    data.toUserId,
    data.organizationId
  );
  if (!toUser) {
    return {
      ok: false,
      reason: "委譲先ユーザーが組織に存在しないか、異なる組織に属しています。",
    };
  }

  // 4. Overlap check
  const overlapping = await approvalDelegationRepository.findOverlapping(
    data.fromUserId,
    data.toUserId,
    data.organizationId,
    data.startDate,
    data.endDate
  );
  if (overlapping.length > 0) {
    return {
      ok: false,
      reason: "同一ユーザー間で期間が重複するアクティブな委譲が既に存在します。",
    };
  }

  // 5. Create delegation
  const delegation = await approvalDelegationRepository.create({
    fromUserId: data.fromUserId,
    toUserId: data.toUserId,
    organizationId: data.organizationId,
    startDate: data.startDate,
    endDate: data.endDate,
  });

  // 6. Audit log
  await auditLogRepository.create({
    action: "delegation.create",
    targetType: "delegation",
    targetId: delegation.id,
    actorId: data.actorId,
    organizationId: data.organizationId,
    metadata: {
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate.toISOString(),
    },
  });

  return { ok: true, delegation };
}
