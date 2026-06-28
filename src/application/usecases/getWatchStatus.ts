import { watchRepository } from "@/infrastructure/repositories";

export type GetWatchStatusResult = {
  isWatching: boolean;
};

export async function getWatchStatus(data: {
  userId: string;
  dealId: string;
  organizationId: string;
}): Promise<GetWatchStatusResult> {
  const watch = await watchRepository.findByUserAndDeal(
    data.userId,
    data.dealId,
    data.organizationId
  );
  return { isWatching: watch !== null };
}
