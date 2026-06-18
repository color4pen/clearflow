import { approveRequest } from "@/application/usecases/approveRequest";

export type BulkApproveInput = {
  requestIds: string[];
  actorId: string;
  actorRole: string;
  organizationId: string;
};

export type BulkApproveResult = {
  results: Array<{ requestId: string; success: boolean; reason?: string }>;
};

export async function bulkApprove(
  data: BulkApproveInput
): Promise<BulkApproveResult> {
  const results: Array<{ requestId: string; success: boolean; reason?: string }> = [];

  for (const requestId of data.requestIds) {
    const result = await approveRequest({
      requestId,
      actorId: data.actorId,
      actorRole: data.actorRole,
      organizationId: data.organizationId,
    });

    if (result.ok) {
      results.push({ requestId, success: true });
    } else {
      results.push({ requestId, success: false, reason: result.reason });
    }
  }

  return { results };
}
