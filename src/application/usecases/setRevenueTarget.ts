import { revenueTargetRepository } from "@/infrastructure/repositories";
import type { RevenueTarget } from "@/domain/models/revenueTarget";

export type SetRevenueTargetResult =
  | { ok: true; target: RevenueTarget }
  | { ok: false; reason: string };

export async function setRevenueTarget(data: {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  targetAmount: number;
}): Promise<SetRevenueTargetResult> {
  const { organizationId, periodStart, periodEnd, targetAmount } = data;

  if (targetAmount <= 0) {
    return { ok: false, reason: "目標金額は1以上の値を入力してください" };
  }

  if (periodStart >= periodEnd) {
    return { ok: false, reason: "期間の終了日は開始日より後の日付を指定してください" };
  }

  const overlapping = await revenueTargetRepository.findOverlapping(
    organizationId,
    periodStart,
    periodEnd
  );

  if (overlapping.length > 0) {
    return { ok: false, reason: "指定した期間には既に目標が設定されています" };
  }

  const target = await revenueTargetRepository.create({
    organizationId,
    periodStart,
    periodEnd,
    targetAmount,
  });

  return { ok: true, target };
}
