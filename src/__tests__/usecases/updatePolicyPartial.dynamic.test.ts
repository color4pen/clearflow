/**
 * updatePolicy usecase — PATCH セマンティクス検証。
 *
 * T-07: approvalPolicies の updatePolicy usecase が PATCH 挙動になったことを検証する。
 * - name のみ指定 → repository に { name } のみ渡される（他フィールドが含まれない）
 * - description: null 指定 → repository に { description: null } が渡される
 * - description 省略 → repository に渡されるオブジェクトに description キーが含まれない
 * - templateId 指定時のテンプレート存在確認が実行される
 * - templateId 省略時のテンプレート存在確認がスキップされる
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { ApprovalPolicy } from "@/domain/models/approvalPolicy";
import type { ApprovalTemplate } from "@/domain/models/approvalTemplate";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  findTemplateCalls: [] as { id: string; orgId: string }[],
  templateReturns: null as ApprovalTemplate | null,
  updateByIdCalls: [] as {
    id: string;
    orgId: string;
    data: Record<string, unknown>;
  }[],
  updateByIdReturns: null as ApprovalPolicy | null,
  auditCalls: [] as unknown[],
};

// ---------------------------------------------------------------------------
// モジュールモック
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories", () => ({
  approvalPolicyRepository: {
    updateById: async (id: string, orgId: string, data: Record<string, unknown>) => {
      state.updateByIdCalls.push({ id, orgId, data });
      return state.updateByIdReturns;
    },
  },
  approvalTemplateRepository: {
    findById: async (id: string, orgId: string) => {
      state.findTemplateCalls.push({ id, orgId });
      return state.templateReturns;
    },
  },
}));

mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (data: unknown) => {
    state.auditCalls.push(data);
  },
}));

mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

import { updatePolicy } from "@/application/usecases/updatePolicy";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const ORG = "org-1";
const POLICY_ID = "policy-001";
const ACTOR_ID = "actor-001";
const TEMPLATE_ID = "template-001";

function makePolicy(overrides: Partial<ApprovalPolicy> = {}): ApprovalPolicy {
  return {
    id: POLICY_ID,
    organizationId: ORG,
    name: "既存ポリシー",
    description: "既存の説明",
    triggerAction: "inquiry.convert",
    conditionField: null,
    conditionOperator: null,
    conditionValue: null,
    templateId: TEMPLATE_ID,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makeTemplate(): ApprovalTemplate {
  return {
    id: TEMPLATE_ID,
    organizationId: ORG,
    name: "テストテンプレート",
    steps: [],
    fields: [],
    createdAt: new Date("2026-01-01"),
  };
}

// ---------------------------------------------------------------------------
// beforeEach
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.findTemplateCalls = [];
  state.templateReturns = null;
  state.updateByIdCalls = [];
  state.updateByIdReturns = null;
  state.auditCalls = [];
});

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("updatePolicy — PATCH セマンティクス（name のみ指定）", () => {
  it("name のみ指定 → repository に { name } のみ渡され、他フィールドが含まれない", async () => {
    state.updateByIdReturns = makePolicy({ name: "新名" });

    const result = await updatePolicy({
      id: POLICY_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      name: "新名",
    });

    expect(result.ok).toBe(true);
    expect(state.updateByIdCalls).toHaveLength(1);
    const data = state.updateByIdCalls[0].data;
    expect(data.name).toBe("新名");
    // 未指定フィールドが含まれない
    expect("description" in data).toBe(false);
    expect("triggerAction" in data).toBe(false);
    expect("conditionField" in data).toBe(false);
    expect("conditionOperator" in data).toBe(false);
    expect("conditionValue" in data).toBe(false);
    expect("templateId" in data).toBe(false);
  });
});

describe("updatePolicy — description の null / undefined 区別", () => {
  it("description: null 指定 → repository に { description: null } が渡される（クリア）", async () => {
    state.updateByIdReturns = makePolicy({ description: null });

    const result = await updatePolicy({
      id: POLICY_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      description: null,
    });

    expect(result.ok).toBe(true);
    expect(state.updateByIdCalls).toHaveLength(1);
    const data = state.updateByIdCalls[0].data;
    expect("description" in data).toBe(true);
    expect(data.description).toBeNull();
  });

  it("description 省略 → repository に渡されるオブジェクトに description キーが含まれない（保持）", async () => {
    state.updateByIdReturns = makePolicy();

    const result = await updatePolicy({
      id: POLICY_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      name: "新名",
      // description は省略
    });

    expect(result.ok).toBe(true);
    expect(state.updateByIdCalls).toHaveLength(1);
    const data = state.updateByIdCalls[0].data;
    expect("description" in data).toBe(false);
  });
});

describe("updatePolicy — templateId 指定時のテンプレート存在確認", () => {
  it("templateId 指定時はテンプレート存在確認が実行される", async () => {
    state.templateReturns = makeTemplate();
    state.updateByIdReturns = makePolicy();

    await updatePolicy({
      id: POLICY_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      templateId: TEMPLATE_ID,
    });

    expect(state.findTemplateCalls).toHaveLength(1);
    expect(state.findTemplateCalls[0].id).toBe(TEMPLATE_ID);
    expect(state.findTemplateCalls[0].orgId).toBe(ORG);
  });

  it("templateId が存在しない場合は ok:false を返す", async () => {
    state.templateReturns = null; // テンプレートが見つからない

    const result = await updatePolicy({
      id: POLICY_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      templateId: "non-existent-template",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("テンプレートが見つかりません");
    }
    // updateById は呼ばれない
    expect(state.updateByIdCalls).toHaveLength(0);
  });

  it("templateId 省略時はテンプレート存在確認がスキップされる", async () => {
    state.updateByIdReturns = makePolicy();

    await updatePolicy({
      id: POLICY_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      name: "新名",
      // templateId は省略
    });

    // findById が呼ばれない
    expect(state.findTemplateCalls).toHaveLength(0);
    expect(state.updateByIdCalls).toHaveLength(1);
  });
});

describe("updatePolicy — 複数フィールド指定", () => {
  it("name と description のみ指定 → 他フィールドが repository に含まれない", async () => {
    state.updateByIdReturns = makePolicy();

    await updatePolicy({
      id: POLICY_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      name: "新名",
      description: "新しい説明",
    });

    expect(state.updateByIdCalls).toHaveLength(1);
    const data = state.updateByIdCalls[0].data;
    expect(data.name).toBe("新名");
    expect(data.description).toBe("新しい説明");
    expect("triggerAction" in data).toBe(false);
    expect("templateId" in data).toBe(false);
    expect("conditionField" in data).toBe(false);
  });

  it("conditionField と conditionOperator と conditionValue 指定 → 3つが repository に渡る", async () => {
    state.updateByIdReturns = makePolicy();

    await updatePolicy({
      id: POLICY_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      conditionField: "amount",
      conditionOperator: "gt",
      conditionValue: "100000",
    });

    expect(state.updateByIdCalls).toHaveLength(1);
    const data = state.updateByIdCalls[0].data;
    expect(data.conditionField).toBe("amount");
    expect(data.conditionOperator).toBe("gt");
    expect(data.conditionValue).toBe("100000");
    expect("name" in data).toBe(false);
    expect("templateId" in data).toBe(false);
  });

  it("conditionField: null 指定 → conditionField が null として repository に渡される", async () => {
    state.updateByIdReturns = makePolicy();

    await updatePolicy({
      id: POLICY_ID,
      organizationId: ORG,
      actorId: ACTOR_ID,
      conditionField: null,
    });

    expect(state.updateByIdCalls).toHaveLength(1);
    const data = state.updateByIdCalls[0].data;
    expect("conditionField" in data).toBe(true);
    expect(data.conditionField).toBeNull();
  });

  it("repository が null を返したとき（対象なし）ok:false になる", async () => {
    state.updateByIdReturns = null;

    const result = await updatePolicy({
      id: "non-existent",
      organizationId: ORG,
      actorId: ACTOR_ID,
      name: "新名",
    });

    expect(result.ok).toBe(false);
  });
});
