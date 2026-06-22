import type { InquiryStatus } from "../models/inquiry";

const VALID_TRANSITIONS: Partial<Record<InquiryStatus, InquiryStatus[]>> = {
  new: ["converted", "declined"],
  declined: ["new"],
};
export function canTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}
