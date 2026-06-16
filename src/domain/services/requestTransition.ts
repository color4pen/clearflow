import type { RequestStatus } from "../models/request";

const VALID_TRANSITIONS: Partial<Record<RequestStatus, RequestStatus[]>> = {
  draft: ["pending"],
  pending: ["approved", "rejected"],
};

export function validateTransition(
  currentStatus: RequestStatus,
  nextStatus: RequestStatus
): { ok: true } | { ok: false; reason: string } {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(nextStatus)) {
    return {
      ok: false,
      reason: `Cannot transition from "${currentStatus}" to "${nextStatus}". Allowed transitions: ${
        allowed ? allowed.join(", ") : "none (terminal state)"
      }.`,
    };
  }
  return { ok: true };
}
