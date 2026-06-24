import { describe, it, expect } from "bun:test";
import {
  buildActionableItems,
  filterStaleDeals,
  buildPipelineSummary,
  calcMonthlyRevenue,
} from "@/domain/services/dashboardService";
import type { RequestWithSteps } from "@/domain/models/request";
import type { Meeting } from "@/domain/models/meeting";
import type { InquiryWithClient } from "@/domain/models/inquiry";
import type { DealWithDetails } from "@/domain/models/deal";
import type { Invoice } from "@/domain/models/invoice";

// ─── buildActionableItems ──────────────────────────────────────────────────

describe("buildActionableItems", () => {
  const makeRequest = (
    id: string,
    approverRole: string,
    deadline: Date | null
  ): RequestWithSteps => ({
    id,
    title: `Request ${id}`,
    formData: {},
    templateId: null,
    status: "pending",
    organizationId: "org-1",
    creatorId: "user-1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
    approvalSteps: [{ approverRole, status: "pending", deadline }],
  });

  const makeMeeting = (
    id: string,
    dealId: string,
    actionItems: { description: string; assignee: string; dueDate: string | null; done: boolean }[]
  ): Meeting => ({
    id,
    organizationId: "org-1",
    dealId,
    type: "hearing",
    date: new Date("2026-06-01"),
    location: null,
    attendees: { internal: [], external: [] },
    summary: null,
    actionItems,
    hearingData: null,
    createdById: "user-1",
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
  });

  const makeInquiry = (id: string, status: "new" | "converted" | "declined"): InquiryWithClient => ({
    id,
    organizationId: "org-1",
    clientId: null,
    title: `Inquiry ${id}`,
    description: null,
    source: "web",
    status,
    assigneeId: null,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    version: 1,
    clientName: null,
  });

  it("T-01: 空入力では空配列を返す", () => {
    const result = buildActionableItems({ requests: [], userRole: "member", meetings: [], inquiries: [] });
    expect(result).toEqual([]);
  });

  it("T-02: approverRole が userRole と一致する pending ステップを持つリクエストを含める", () => {
    const req = makeRequest("req-1", "member", new Date("2026-07-01"));
    const result = buildActionableItems({
      requests: [req],
      userRole: "member",
      meetings: [],
      inquiries: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("approval");
    expect(result[0].title).toBe("Request req-1");
    expect(result[0].linkHref).toBe("/requests/req-1");
  });

  it("T-03: approverRole が userRole と一致しないリクエストは除外される", () => {
    const req = makeRequest("req-1", "manager", new Date("2026-07-01"));
    const result = buildActionableItems({
      requests: [req],
      userRole: "member",
      meetings: [],
      inquiries: [],
    });
    expect(result).toHaveLength(0);
  });

  it("T-04: done=false のアクションアイテムを含める", () => {
    const meeting = makeMeeting("mtg-1", "deal-1", [
      { description: "資料準備", assignee: "田中", dueDate: "2026-07-01", done: false },
      { description: "完了済み", assignee: "鈴木", dueDate: null, done: true },
    ]);
    const result = buildActionableItems({
      requests: [],
      userRole: "member",
      meetings: [meeting],
      inquiries: [],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("action_item");
    expect(result[0].title).toBe("資料準備");
    expect(result[0].meta.assignee).toBe("田中");
    expect(result[0].linkHref).toBe("/deals/deal-1/meetings/mtg-1");
  });

  it("T-05: status=new の引合を含める", () => {
    const result = buildActionableItems({
      requests: [],
      userRole: "member",
      meetings: [],
      inquiries: [makeInquiry("inq-1", "new"), makeInquiry("inq-2", "converted")],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("inquiry");
    expect(result[0].linkHref).toBe("/inquiries");
  });

  it("T-06: dueDate 昇順でソートされ、null は末尾", () => {
    const today = new Date("2026-06-24");
    const tomorrow = new Date("2026-06-25");
    const nextWeek = new Date("2026-07-01");

    const meeting = makeMeeting("mtg-1", "deal-1", [
      { description: "アクション today", assignee: "A", dueDate: "2026-06-24", done: false },
    ]);
    const req1 = makeRequest("req-1", "member", tomorrow);
    const req2 = makeRequest("req-2", "member", nextWeek);
    const inquiry = makeInquiry("inq-1", "new"); // dueDate = null

    const result = buildActionableItems({
      requests: [req1, req2],
      userRole: "member",
      meetings: [meeting],
      inquiries: [inquiry],
    });

    expect(result).toHaveLength(4);
    expect(result[0].dueDate?.toDateString()).toBe(today.toDateString());
    expect(result[1].dueDate?.toDateString()).toBe(tomorrow.toDateString());
    expect(result[2].dueDate?.toDateString()).toBe(nextWeek.toDateString());
    expect(result[3].dueDate).toBeNull();
  });

  it("T-07: 3 種類のアイテムが統合されて返る", () => {
    const req = makeRequest("req-1", "member", new Date("2026-07-10"));
    const meeting = makeMeeting("mtg-1", "deal-1", [
      { description: "タスク", assignee: "A", dueDate: "2026-07-05", done: false },
    ]);
    const inquiry = makeInquiry("inq-1", "new");

    const result = buildActionableItems({
      requests: [req],
      userRole: "member",
      meetings: [meeting],
      inquiries: [inquiry],
    });

    const types = result.map((i) => i.type);
    expect(types).toContain("approval");
    expect(types).toContain("action_item");
    expect(types).toContain("inquiry");
  });
});

// ─── filterStaleDeals ──────────────────────────────────────────────────────

describe("filterStaleDeals", () => {
  const makeDeal = (id: string, phase: DealWithDetails["phase"], daysAgo: number): DealWithDetails => {
    const updatedAt = new Date();
    updatedAt.setDate(updatedAt.getDate() - daysAgo);
    return {
      id,
      organizationId: "org-1",
      inquiryId: null,
      clientId: "client-1",
      title: `Deal ${id}`,
      phase,
      estimatedAmount: null,
      estimatedStartDate: null,
      estimatedEndDate: null,
      contractType: null,
      assigneeId: null,
      technicalLeadId: null,
      estimateRequestId: null,
      notes: null,
      createdAt: new Date(),
      updatedAt,
      version: 1,
      inquiryTitle: null,
      clientName: "Test Client",
      assigneeName: null,
    };
  };

  it("T-01: updatedAt が 14 日以上前の negotiation フェーズの案件が含まれる", () => {
    const deal = makeDeal("d1", "negotiation", 20);
    const result = filterStaleDeals([deal], new Date(), 14);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("T-02: updatedAt が 10 日前の案件は含まれない", () => {
    const deal = makeDeal("d1", "negotiation", 10);
    const result = filterStaleDeals([deal], new Date(), 14);
    expect(result).toHaveLength(0);
  });

  it("T-03: phase が won の案件は updatedAt が古くても含まれない", () => {
    const deal = makeDeal("d1", "won", 30);
    const result = filterStaleDeals([deal], new Date(), 14);
    expect(result).toHaveLength(0);
  });

  it("T-04: phase が lost の案件も含まれない", () => {
    const deal = makeDeal("d1", "lost", 30);
    const result = filterStaleDeals([deal], new Date(), 14);
    expect(result).toHaveLength(0);
  });

  it("T-05: ちょうど 14 日前（境界値）の案件は含まれる", () => {
    const now = new Date("2026-06-24T12:00:00Z");
    const updatedAt = new Date("2026-06-10T12:00:00Z"); // exactly 14 days ago
    const deal: DealWithDetails = {
      id: "d1",
      organizationId: "org-1",
      inquiryId: null,
      clientId: "client-1",
      title: "Deal",
      phase: "negotiation",
      estimatedAmount: null,
      estimatedStartDate: null,
      estimatedEndDate: null,
      contractType: null,
      assigneeId: null,
      technicalLeadId: null,
      estimateRequestId: null,
      notes: null,
      createdAt: new Date("2026-01-01"),
      updatedAt,
      version: 1,
      inquiryTitle: null,
      clientName: "Client",
      assigneeName: null,
    };
    const result = filterStaleDeals([deal], now, 14);
    expect(result).toHaveLength(1);
  });
});

// ─── buildPipelineSummary ──────────────────────────────────────────────────

describe("buildPipelineSummary", () => {
  const makeDeal = (
    id: string,
    phase: DealWithDetails["phase"],
    estimatedAmount: number | null
  ): DealWithDetails => ({
    id,
    organizationId: "org-1",
    inquiryId: null,
    clientId: "client-1",
    title: `Deal ${id}`,
    phase,
    estimatedAmount,
    estimatedStartDate: null,
    estimatedEndDate: null,
    contractType: null,
    assigneeId: null,
    technicalLeadId: null,
    estimateRequestId: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    inquiryTitle: null,
    clientName: "Client",
    assigneeName: null,
  });

  it("T-01: 全 5 フェーズが常に含まれる", () => {
    const result = buildPipelineSummary([]);
    expect(result).toHaveLength(5);
    const phases = result.map((r) => r.phase);
    expect(phases).toContain("proposal_prep");
    expect(phases).toContain("proposed");
    expect(phases).toContain("negotiation");
    expect(phases).toContain("won");
    expect(phases).toContain("lost");
  });

  it("T-02: 案件がないフェーズは count: 0, totalAmount: 0 を返す", () => {
    const result = buildPipelineSummary([]);
    for (const item of result) {
      expect(item.count).toBe(0);
      expect(item.totalAmount).toBe(0);
    }
  });

  it("T-03: count と totalAmount がフェーズごとに正しく集計される", () => {
    const deals = [
      makeDeal("d1", "proposal_prep", 1000000),
      makeDeal("d2", "proposal_prep", 2000000),
      makeDeal("d3", "negotiation", 5000000),
    ];
    const result = buildPipelineSummary(deals);
    const pp = result.find((r) => r.phase === "proposal_prep")!;
    const neg = result.find((r) => r.phase === "negotiation")!;
    expect(pp.count).toBe(2);
    expect(pp.totalAmount).toBe(3000000);
    expect(neg.count).toBe(1);
    expect(neg.totalAmount).toBe(5000000);
  });

  it("T-04: estimatedAmount が null の案件は金額に影響しない（count には含む）", () => {
    const deals = [
      makeDeal("d1", "proposal_prep", 1000000),
      makeDeal("d2", "proposal_prep", null),
    ];
    const result = buildPipelineSummary(deals);
    const pp = result.find((r) => r.phase === "proposal_prep")!;
    expect(pp.count).toBe(2);
    expect(pp.totalAmount).toBe(1000000);
  });
});

// ─── calcMonthlyRevenue ────────────────────────────────────────────────────

describe("calcMonthlyRevenue", () => {
  const makeInvoice = (amount: number): Invoice => ({
    id: `inv-${amount}`,
    organizationId: "org-1",
    contractId: "contract-1",
    title: "Invoice",
    amount,
    issueDate: null,
    dueDate: new Date(),
    status: "paid",
    invoicedAt: null,
    paidAt: new Date(),
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it("T-01: amount の合計を返す", () => {
    expect(calcMonthlyRevenue([makeInvoice(100000), makeInvoice(200000)])).toBe(300000);
  });

  it("T-02: 空配列は 0 を返す", () => {
    expect(calcMonthlyRevenue([])).toBe(0);
  });

  it("T-03: 1 件の場合はその amount を返す", () => {
    expect(calcMonthlyRevenue([makeInvoice(500000)])).toBe(500000);
  });
});
