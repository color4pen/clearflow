import type { InquiryStatus } from "../models/inquiry";

const VALID_TRANSITIONS: Partial<Record<InquiryStatus, InquiryStatus[]>> = {
  new: ["in_progress", "declined"],
  in_progress: ["converted", "declined"],
  declined: ["in_progress"],
};
export function canTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}
