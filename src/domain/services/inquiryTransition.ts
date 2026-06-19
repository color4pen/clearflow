import type { InquiryStatus } from "../models/inquiry";

// 終端状態（converted, declined）はマップに含めない
const VALID_TRANSITIONS: Partial<Record<InquiryStatus, InquiryStatus[]>> = {
  new: ["in_progress", "declined"],
  in_progress: ["converted", "declined"],
};

/**
 * 引き合いのステータス遷移が許可されているかを返す。
 * 終端状態（converted, declined）からの遷移は常に false。
 */
export function canTransition(from: InquiryStatus, to: InquiryStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}
