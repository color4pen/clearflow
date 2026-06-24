import type { RequestWithSteps } from "@/domain/models/request";
import type { Meeting } from "@/domain/models/meeting";
import type { InquiryWithClient } from "@/domain/models/inquiry";
import type { DealWithDetails, DealPhase } from "@/domain/models/deal";
import type { Invoice } from "@/domain/models/invoice";

// ─── ActionableItem ────────────────────────────────────────────────────────

export type ActionableItem = {
  type: "approval" | "action_item" | "inquiry";
  title: string;
  dueDate: Date | null;
  linkHref: string;
  meta: Record<string, string>;
};

/**
 * アクション待ちリストを統合して期日昇順でソートして返す。
 * dueDate が null のアイテムは末尾に配置する。
 * 純粋関数。
 */
export function buildActionableItems(params: {
  requests: RequestWithSteps[];
  userRole: string;
  meetings: Meeting[];
  inquiries: InquiryWithClient[];
}): ActionableItem[] {
  const items: ActionableItem[] = [];

  // (a) 承認リクエスト: status=pending かつ approverRole が userRole と一致する pending ステップを持つもの
  for (const req of params.requests) {
    if (req.status !== "pending") continue;
    const matchingStep = req.approvalSteps.find(
      (step) => step.approverRole === params.userRole && step.status === "pending"
    );
    if (!matchingStep) continue;

    // 最も早い pending ステップの deadline を dueDate とする
    const pendingStepDeadlines = req.approvalSteps
      .filter((step) => step.status === "pending" && step.deadline !== null)
      .map((step) => step.deadline as Date);
    const dueDate =
      pendingStepDeadlines.length > 0
        ? pendingStepDeadlines.reduce((earliest, d) => (d < earliest ? d : earliest))
        : null;

    items.push({
      type: "approval",
      title: req.title,
      dueDate,
      linkHref: `/requests/${req.id}`,
      meta: {},
    });
  }

  // (b) アクションアイテム: 全商談の actionItems から done=false のもの
  for (const meeting of params.meetings) {
    for (const actionItem of meeting.actionItems) {
      if (actionItem.done) continue;
      const dueDate = actionItem.dueDate ? new Date(actionItem.dueDate) : null;
      items.push({
        type: "action_item",
        title: actionItem.description,
        dueDate,
        linkHref: `/deals/${meeting.dealId}/meetings/${meeting.id}`,
        meta: { assignee: actionItem.assignee },
      });
    }
  }

  // (c) 引合: status=new のもの
  for (const inquiry of params.inquiries) {
    if (inquiry.status !== "new") continue;
    items.push({
      type: "inquiry",
      title: inquiry.title,
      dueDate: null,
      linkHref: `/inquiries`,
      meta: {},
    });
  }

  // dueDate 昇順、null は末尾
  items.sort((a, b) => {
    if (a.dueDate === null && b.dueDate === null) return 0;
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  return items;
}

// ─── filterStaleDeals ──────────────────────────────────────────────────────

/**
 * 停滞案件（won/lost 以外 かつ updatedAt が thresholdDays 日以上前）を返す。
 * 純粋関数。
 */
export function filterStaleDeals(
  deals: DealWithDetails[],
  now: Date,
  thresholdDays: number
): DealWithDetails[] {
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  return deals.filter(
    (deal) =>
      deal.phase !== "won" &&
      deal.phase !== "lost" &&
      now.getTime() - deal.updatedAt.getTime() >= thresholdMs
  );
}

// ─── buildPipelineSummary ──────────────────────────────────────────────────

export type PipelineSummaryItem = {
  phase: DealPhase;
  label: string;
  count: number;
  totalAmount: number;
};

const PHASE_LABELS: Record<DealPhase, string> = {
  proposal_prep: "提案準備",
  proposed: "提案済",
  negotiation: "交渉中",
  won: "受注",
  lost: "失注",
};

const ALL_PHASES: DealPhase[] = ["proposal_prep", "proposed", "negotiation", "won", "lost"];

/**
 * フェーズごとの案件数と想定金額合計を返す。
 * 全 5 フェーズを常に返す。estimatedAmount が null の案件は金額集計から除外する。
 * 純粋関数。
 */
export function buildPipelineSummary(deals: DealWithDetails[]): PipelineSummaryItem[] {
  const map = new Map<DealPhase, { count: number; totalAmount: number }>();
  for (const phase of ALL_PHASES) {
    map.set(phase, { count: 0, totalAmount: 0 });
  }

  for (const deal of deals) {
    const entry = map.get(deal.phase);
    if (!entry) continue;
    entry.count += 1;
    if (deal.estimatedAmount !== null) {
      entry.totalAmount += deal.estimatedAmount;
    }
  }

  return ALL_PHASES.map((phase) => {
    const { count, totalAmount } = map.get(phase)!;
    return { phase, label: PHASE_LABELS[phase], count, totalAmount };
  });
}

// ─── calcMonthlyRevenue ────────────────────────────────────────────────────

/**
 * 請求配列の amount 合計を返す。空配列の場合は 0 を返す。
 * 純粋関数。
 */
export function calcMonthlyRevenue(invoices: Invoice[]): number {
  return invoices.reduce((sum, inv) => sum + inv.amount, 0);
}
