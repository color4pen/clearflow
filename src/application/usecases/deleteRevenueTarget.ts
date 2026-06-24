import { revenueTargetRepository } from "@/infrastructure/repositories";

export type DeleteRevenueTargetResult = { ok: true } | { ok: false; reason: string };

export async function deleteRevenueTarget(data: {
  id: string;
  organizationId: string;
}): Promise<DeleteRevenueTargetResult> {
  const { id, organizationId } = data;

  const existing = await revenueTargetRepository.findById(id, organizationId);
  if (!existing) {
    return { ok: false, reason: "売上目標が見つかりません" };
  }

  await revenueTargetRepository.deleteById(id, organizationId);
  return { ok: true };
}
