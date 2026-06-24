import { updateInquiryStatus } from "@/application/usecases/updateInquiryStatus";
import type { ApprovalCompleted } from "@/domain/events/types";

/**
 * Handles the ApprovalCompleted event.
 *
 * When originTriggerAction is "inquiry.convert", calls updateInquiryStatus
 * with skipPolicyCheck=true to generate the deal without re-evaluating policies
 * (preventing an infinite loop).
 */
export async function handleApprovalCompleted(event: ApprovalCompleted): Promise<void> {
  if (event.payload.originTriggerAction !== "inquiry.convert") {
    // Future extension point for other trigger actions
    return;
  }

  const { originTriggerEntityId } = event.payload;
  if (originTriggerEntityId === null) {
    console.error(
      "[handleApprovalCompleted] originTriggerEntityId is null for requestId:",
      event.payload.requestId
    );
    return;
  }

  const result = await updateInquiryStatus(
    {
      inquiryId: originTriggerEntityId,
      organizationId: event.organizationId,
      actorId: event.actorId,
      newStatus: "converted",
    },
    { skipPolicyCheck: true }
  );

  if (!result.ok) {
    console.error(
      "[handleApprovalCompleted] updateInquiryStatus failed:",
      result.reason,
      "requestId:",
      event.payload.requestId
    );
  }
}
