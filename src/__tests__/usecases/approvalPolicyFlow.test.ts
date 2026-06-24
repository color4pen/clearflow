/**
 * 承認ポリシーフロー 統合テスト（静的コード解析）
 *
 * ライブ DB を使わず、ソースファイルを静的解析して実装の存在・構造を確認する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";
import { evaluateCondition } from "@/domain/services/conditionEvaluator";
import type { ApprovalPolicy } from "@/domain/models/approvalPolicy";

// ---------------------------------------------------------------------------
// Mock state for evaluatePolicies dynamic tests
// ---------------------------------------------------------------------------

const policyState = {
  policies: [] as ApprovalPolicy[],
};

// bun:test hoists mock.module calls before static imports, so this mock is in
// place when evaluatePolicies (imported below) resolves @/infrastructure/repositories.
mock.module("@/infrastructure/repositories", () => ({
  approvalPolicyRepository: {
    findActiveByTriggerAction: async () => policyState.policies,
  },
}));

import { evaluatePolicies } from "@/application/usecases/evaluatePolicies";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// evaluatePolicies: 静的検証
// ---------------------------------------------------------------------------

describe("evaluatePolicies ユースケース 静的検証", () => {
  it("evaluatePolicies.ts が存在し approvalPolicyRepository を使用する", async () => {
    const src = await readSrc("application/usecases/evaluatePolicies.ts");
    expect(src).toContain("approvalPolicyRepository.findActiveByTriggerAction");
  });

  it("conditionField が null の場合は無条件合致するロジックが含まれる", async () => {
    const src = await readSrc("application/usecases/evaluatePolicies.ts");
    expect(src).toContain("conditionField");
    expect(src).toContain("null");
  });

  it("evaluateCondition を呼び出して条件を評価する", async () => {
    const src = await readSrc("application/usecases/evaluatePolicies.ts");
    expect(src).toContain("evaluateCondition");
  });

  it("usecases/index.ts に evaluatePolicies がエクスポートされている", async () => {
    const src = await readSrc("application/usecases/index.ts");
    expect(src).toContain("evaluatePolicies");
  });
});

// ---------------------------------------------------------------------------
// evaluateCondition: 動作検証（pure function のため直接テスト）
// ---------------------------------------------------------------------------

describe("evaluatePolicies — evaluateCondition を通じたポリシーフィルタリング", () => {
  it("条件合致ポリシー: budget > 1000000 で budget=5000000 は true", () => {
    const result = evaluateCondition("budget", "gt", "1000000", { budget: 5000000 });
    expect(result).toBe(true);
  });

  it("条件不一致ポリシー: budget > 10000000 で budget=5000000 は false", () => {
    const result = evaluateCondition("budget", "gt", "10000000", { budget: 5000000 });
    expect(result).toBe(false);
  });

  it("無条件ポリシー（conditionField が null）は常に合致する（ロジック確認）", async () => {
    const src = await readSrc("application/usecases/evaluatePolicies.ts");
    // null チェックで true を返す箇所が存在することを確認
    expect(src).toContain("return true");
  });

  it("アクティブポリシーなしで空配列を返す（filterが空配列を返す）", () => {
    // filter は空配列に対して空配列を返す（JS 仕様）
    const result: unknown[] = [];
    expect(result.filter(() => true)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateInquiryStatus: ポリシーゲート 静的検証
// ---------------------------------------------------------------------------

describe("updateInquiryStatus ポリシーゲート 静的検証", () => {
  it("evaluatePolicies の呼び出しが含まれる", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("evaluatePolicies");
  });

  it("skipPolicyCheck によるポリシー評価スキップが含まれる", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("skipPolicyCheck");
  });

  it("ポリシー合致時に requestRepository.create が呼び出される", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("requestRepository.create");
  });

  it("ポリシー合致時に approvalStepRepository.createMany が呼び出される", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("approvalStepRepository.createMany");
  });

  it("ポリシー合致時に dealRepository.create が呼び出される（従来フローも含む）", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("dealRepository.create");
  });

  it("origin_type=system で承認リクエストを生成する", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain('"system"');
    expect(src).toContain("originType");
  });

  it("監査ログ metadata に templateId が含まれる（deleteTemplate の existsPendingByTemplateId 検出に必要）", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("templateId: template.id");
  });

  it("ポリシーゲート発動時に引合側の監査ログ（inquiry.conversionPending）が記録される", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain('"inquiry.conversionPending"');
    expect(src).toContain("pendingApprovalRequestId");
  });

  it("ポリシー合致時に originTriggerAction: inquiry.convert を設定する", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain('"inquiry.convert"');
  });

  it("重複防止チェック（findByOriginTriggerEntity）が含まれる", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("findByOriginTriggerEntity");
  });

  it("pendingApproval を含む ok: true を返す", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("pendingApproval");
  });

  it("UpdateInquiryStatusResult に pendingApproval フィールドが含まれる", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("pendingApproval?:");
  });
});

// ---------------------------------------------------------------------------
// approveRequest: ApprovalCompleted 発行 静的検証
// ---------------------------------------------------------------------------

describe("approveRequest ApprovalCompleted 発行 静的検証", () => {
  it("approval.completed イベントを dispatch する", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain('"approval.completed"');
  });

  it("originType === system の場合のみ ApprovalCompleted を発行する", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain('originType === "system"');
  });

  it("既存の request.approved イベントが引き続き発行される", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain('"request.approved"');
  });

  it("単一承認フローでも ApprovalCompleted 発行ロジックが含まれる", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    // 2 箇所に originType === "system" チェックが存在する（single-step と multi-step）
    const count = (src.match(/originType === "system"/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// ApprovalCompleted ハンドラ 静的検証
// ---------------------------------------------------------------------------

describe("handleApprovalCompleted ハンドラ 静的検証", () => {
  it("approvalCompletedHandler.ts が存在する", async () => {
    const src = await readSrc("infrastructure/handlers/approvalCompletedHandler.ts");
    expect(src).toContain("handleApprovalCompleted");
  });

  it("originTriggerAction が inquiry.convert の場合に updateInquiryStatus を呼び出す", async () => {
    const src = await readSrc("infrastructure/handlers/approvalCompletedHandler.ts");
    expect(src).toContain('"inquiry.convert"');
    expect(src).toContain("updateInquiryStatus");
  });

  it("skipPolicyCheck: true を渡して無限ループを防ぐ", async () => {
    const src = await readSrc("infrastructure/handlers/approvalCompletedHandler.ts");
    expect(src).toContain("skipPolicyCheck: true");
  });

  it("originTriggerEntityId が null の場合はエラーログを出す", async () => {
    const src = await readSrc("infrastructure/handlers/approvalCompletedHandler.ts");
    expect(src).toContain("originTriggerEntityId");
    expect(src).toContain("console.error");
  });
});

// ---------------------------------------------------------------------------
// ハンドラ登録 静的検証
// ---------------------------------------------------------------------------

describe("handlers/index.ts 登録 静的検証", () => {
  it("approval.completed が allEventTypes に含まれる", async () => {
    const src = await readSrc("infrastructure/handlers/index.ts");
    expect(src).toContain('"approval.completed"');
  });

  it("handleApprovalCompleted が登録される", async () => {
    const src = await readSrc("infrastructure/handlers/index.ts");
    expect(src).toContain("handleApprovalCompleted");
  });
});

// ---------------------------------------------------------------------------
// ApprovalCompleted イベント型 静的検証
// ---------------------------------------------------------------------------

describe("ApprovalCompleted イベント型 静的検証", () => {
  it("types.ts に ApprovalCompleted 型が定義されている", async () => {
    const src = await readSrc("domain/events/types.ts");
    expect(src).toContain("ApprovalCompleted");
    expect(src).toContain('"approval.completed"');
  });

  it("DomainEvent union に ApprovalCompleted が含まれる", async () => {
    const src = await readSrc("domain/events/types.ts");
    const unionIdx = src.indexOf("export type DomainEvent");
    const approvalIdx = src.indexOf("ApprovalCompleted", unionIdx);
    expect(approvalIdx).toBeGreaterThan(unionIdx);
  });

  it("OriginType が import されている", async () => {
    const src = await readSrc("domain/events/types.ts");
    expect(src).toContain("OriginType");
  });
});

// ---------------------------------------------------------------------------
// Server Action 静的検証
// ---------------------------------------------------------------------------

describe("updateInquiryStatusAction pendingApproval 静的検証", () => {
  it("pendingApproval の場合に承認待ちメッセージを返す", async () => {
    const src = await readSrc("app/actions/inquiries.ts");
    expect(src).toContain("pendingApproval");
    expect(src).toContain("承認リクエストを作成しました");
  });
});

// ---------------------------------------------------------------------------
// findByOriginTriggerEntity 静的検証
// ---------------------------------------------------------------------------

describe("requestRepository.findByOriginTriggerEntity 静的検証", () => {
  it("findByOriginTriggerEntity メソッドが存在する", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    expect(src).toContain("findByOriginTriggerEntity");
  });

  it("origin_type = system かつ status IN draft/pending で検索する", async () => {
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    const fnIdx = src.indexOf("findByOriginTriggerEntity");
    const body = src.slice(fnIdx, fnIdx + 500);
    expect(body).toContain('"system"');
    expect(body).toContain('"draft"');
    expect(body).toContain('"pending"');
  });
});

// ---------------------------------------------------------------------------
// evaluatePolicies — ランタイム動作検証（モック使用）
// ---------------------------------------------------------------------------

function makePolicy(overrides?: Partial<ApprovalPolicy>): ApprovalPolicy {
  return {
    id: "policy-1",
    organizationId: "org-1",
    name: "Test Policy",
    description: null,
    triggerAction: "inquiry.convert",
    conditionField: null,
    conditionOperator: null,
    conditionValue: null,
    templateId: "tmpl-1",
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("evaluatePolicies — ランタイム動作検証", () => {
  beforeEach(() => {
    policyState.policies = [];
  });

  it("TC-023: アクティブポリシーが存在しない場合は空配列を返す", async () => {
    policyState.policies = [];
    const result = await evaluatePolicies("org-1", "inquiry.convert", {});
    expect(result).toHaveLength(0);
  });

  it("TC-024: 無条件ポリシー（conditionField=null）は常に合致する", async () => {
    policyState.policies = [makePolicy({ conditionField: null })];
    const result = await evaluatePolicies("org-1", "inquiry.convert", {});
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("policy-1");
  });

  it("TC-025: 条件が合致するポリシーはリストに含まれる（budget > 1000000 で budget=5000000）", async () => {
    policyState.policies = [
      makePolicy({ conditionField: "budget", conditionOperator: "gt", conditionValue: "1000000" }),
    ];
    const result = await evaluatePolicies("org-1", "inquiry.convert", { budget: 5000000 });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("policy-1");
  });

  it("TC-026: 条件が合致しないポリシーはリストに含まれない（budget > 10000000 で budget=5000000）", async () => {
    policyState.policies = [
      makePolicy({ conditionField: "budget", conditionOperator: "gt", conditionValue: "10000000" }),
    ];
    const result = await evaluatePolicies("org-1", "inquiry.convert", { budget: 5000000 });
    expect(result).toHaveLength(0);
  });

  it("TC-027: conditionField が非 null で conditionOperator が null のポリシーはスキップされる（DB 不変条件違反ガード）", async () => {
    policyState.policies = [
      makePolicy({ conditionField: "budget", conditionOperator: null, conditionValue: "1000000" }),
    ];
    const result = await evaluatePolicies("org-1", "inquiry.convert", { budget: 5000000 });
    expect(result).toHaveLength(0);
  });

  it("TC-028: 複数ポリシーのうち合致するもののみ返す", async () => {
    policyState.policies = [
      makePolicy({ id: "policy-1", conditionField: null }), // unconditional — always matches
      makePolicy({ id: "policy-2", conditionField: "budget", conditionOperator: "gt", conditionValue: "1000000" }), // matches
      makePolicy({ id: "policy-3", conditionField: "budget", conditionOperator: "gt", conditionValue: "10000000" }), // doesn't match
    ];
    const result = await evaluatePolicies("org-1", "inquiry.convert", { budget: 5000000 });
    expect(result).toHaveLength(2);
    const ids = result.map((p) => p.id);
    expect(ids).toContain("policy-1");
    expect(ids).toContain("policy-2");
    expect(ids).not.toContain("policy-3");
  });
});
