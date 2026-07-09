/**
 * interactions Server Actions の動的テスト（TC-020 / TC-021 / TC-023）。
 *
 * 注意: @/application/usecases/* を mock するとcontractAdjustment / invoiceAdjustment
 * の usecase テストと干渉するため、infrastructure の個別ファイル（barrel 以外）を mock して
 * 実際の usecase を実行させる方式を採用する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Interaction } from "@/domain/models/interaction";
import type { Contract } from "@/domain/models/contract";
import type { Invoice } from "@/domain/models/invoice";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const authState = {
  sessionUserId: null as string | null,
  sessionUserRole: "admin" as string,
  sessionOrgId: "org-001",
};

/** 契約 infrastructure モック用状態 */
const contractInfra = {
  contract: null as Contract | null,
  createdInteraction: null as Interaction | null,
  createCallArgs: null as Record<string, unknown> | null,
};

/** 請求 infrastructure モック用状態（invoiceRepository + interactionRepository 共有） */
const invoiceInfra = {
  invoice: null as Invoice | null,
  createdInteraction: null as Interaction | null,
  createCallArgs: null as Record<string, unknown> | null,
};

const revalidatedPaths: string[] = [];

// ---------------------------------------------------------------------------
// モジュールモック（static import より前に評価される）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/auth", () => ({
  auth: async () => {
    if (!authState.sessionUserId) return null;
    return {
      user: {
        id: authState.sessionUserId,
        organizationId: authState.sessionOrgId,
        role: authState.sessionUserRole,
      },
    };
  },
}));

/**
 * 個別ファイルをモックすることで barrel モックの @/infrastructure/repositories と
 * 干渉しない。usecase（createContractAdjustment / createInvoiceAdjustment）は
 * barrel 経由でこれらを参照するが、Bun の モジュール解決では個別ファイルモックが
 * barrel モックより優先して反映される。
 */
mock.module("@/infrastructure/repositories/contractRepository", () => ({
  findById: async () => contractInfra.contract,
}));

mock.module("@/infrastructure/repositories/invoiceRepository", () => ({
  findById: async () => invoiceInfra.invoice,
}));

mock.module("@/infrastructure/repositories/interactionRepository", () => ({
  create: async (data: Record<string, unknown>) => {
    // contract or invoice action のどちらが呼んだかで状態を振り分ける
    if (data.contractId) {
      contractInfra.createCallArgs = data;
      return contractInfra.createdInteraction;
    } else {
      invoiceInfra.createCallArgs = data;
      return invoiceInfra.createdInteraction;
    }
  },
}));

mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async () => {},
}));

mock.module("next/cache", () => ({
  revalidatePath: (path: string) => {
    revalidatedPaths.push(path);
  },
}));

import {
  recordContractAdjustmentAction,
  recordInvoiceAdjustmentAction,
} from "@/app/actions/interactions";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const VALID_CONTRACT_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_INVOICE_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

function makeContractFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("contractId", VALID_CONTRACT_ID);
  fd.set("summary", "条件変更の交渉");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

function makeInvoiceFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("invoiceId", VALID_INVOICE_ID);
  fd.set("contractId", VALID_CONTRACT_ID);
  fd.set("summary", "請求金額の調整");
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v);
  return fd;
}

function makeContract(): Contract {
  return {
    id: VALID_CONTRACT_ID,
    organizationId: "org-001",
    dealId: "deal-001",
    clientId: "client-001",
    title: "テスト契約",
    contractType: null,
    amount: 1000000,
    startDate: new Date("2026-01-01"),
    endDate: null,
    paymentTerms: null,
    renewalType: "one_time",
    renewalCycle: null,
    status: "active",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
  };
}

function makeInvoice(): Invoice {
  return {
    id: VALID_INVOICE_ID,
    organizationId: "org-001",
    contractId: VALID_CONTRACT_ID,
    title: "テスト請求",
    amount: 500000,
    issueDate: new Date("2026-06-01"),
    dueDate: new Date("2026-06-30"),
    status: "invoiced",
    invoicedAt: new Date("2026-06-01"),
    paidAt: null,
    notes: null,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    version: 1,
  };
}

function makeInteraction(relatedTo: "contract" | "invoice"): Interaction {
  return {
    id: "interaction-001",
    organizationId: "org-001",
    kind: "note",
    dealId: null,
    inquiryId: null,
    contractId: relatedTo === "contract" ? VALID_CONTRACT_ID : null,
    invoiceId: relatedTo === "invoice" ? VALID_INVOICE_ID : null,
    clientId: null,
    meetingType: null,
    date: new Date("2026-06-01"),
    location: null,
    attendees: [],
    summary: "テスト要約",
    preparation: null,
    actionItems: [],
    details: null,
    createdById: "user-admin",
    version: 1,
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
  };
}

// ---------------------------------------------------------------------------
// 共通リセット
// ---------------------------------------------------------------------------

beforeEach(() => {
  authState.sessionUserId = null;
  authState.sessionUserRole = "admin";
  authState.sessionOrgId = "org-001";
  contractInfra.contract = null;
  contractInfra.createdInteraction = null;
  contractInfra.createCallArgs = null;
  invoiceInfra.invoice = null;
  invoiceInfra.createdInteraction = null;
  invoiceInfra.createCallArgs = null;
  revalidatedPaths.length = 0;
});

// ---------------------------------------------------------------------------
// TC-020: 未認証ユーザーが記録 Action を呼ぶと認証エラーが返る
// ---------------------------------------------------------------------------

describe("TC-020: recordContractAdjustmentAction — 未認証", () => {
  it("セッションがない場合、「認証が必要です」を返す", async () => {
    authState.sessionUserId = null;

    const result = await recordContractAdjustmentAction({}, makeContractFormData());

    expect(result.message).toBe("認証が必要です");
  });

  it("未認証時は usecase が呼ばれない（createCallArgs が null のまま）", async () => {
    authState.sessionUserId = null;

    await recordContractAdjustmentAction({}, makeContractFormData());

    expect(contractInfra.createCallArgs).toBeNull();
  });
});

describe("TC-020: recordInvoiceAdjustmentAction — 未認証", () => {
  it("セッションがない場合、「認証が必要です」を返す", async () => {
    authState.sessionUserId = null;

    const result = await recordInvoiceAdjustmentAction({}, makeInvoiceFormData());

    expect(result.message).toBe("認証が必要です");
  });

  it("未認証時は usecase が呼ばれない（createCallArgs が null のまま）", async () => {
    authState.sessionUserId = null;

    await recordInvoiceAdjustmentAction({}, makeInvoiceFormData());

    expect(invoiceInfra.createCallArgs).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC-021: 認可不足のユーザーが記録 Action を呼ぶと権限エラーが返る
// ---------------------------------------------------------------------------

describe("TC-021: recordContractAdjustmentAction — 認可不足（finance ロール / recordContractInteraction）", () => {
  it("finance ロールの場合、「この操作を実行する権限がありません」を返す", async () => {
    authState.sessionUserId = "user-finance";
    authState.sessionUserRole = "finance";

    const result = await recordContractAdjustmentAction({}, makeContractFormData());

    expect(result.message).toBe("この操作を実行する権限がありません");
  });

  it("認可不足時は usecase が呼ばれない", async () => {
    authState.sessionUserId = "user-finance";
    authState.sessionUserRole = "finance";

    await recordContractAdjustmentAction({}, makeContractFormData());

    expect(contractInfra.createCallArgs).toBeNull();
  });
});

describe("TC-021: recordInvoiceAdjustmentAction — 認可不足（member ロール / recordInvoiceInteraction）", () => {
  it("member ロールの場合、「この操作を実行する権限がありません」を返す", async () => {
    authState.sessionUserId = "user-member";
    authState.sessionUserRole = "member";

    const result = await recordInvoiceAdjustmentAction({}, makeInvoiceFormData());

    expect(result.message).toBe("この操作を実行する権限がありません");
  });

  it("認可不足時は usecase が呼ばれない", async () => {
    authState.sessionUserId = "user-member";
    authState.sessionUserRole = "member";

    await recordInvoiceAdjustmentAction({}, makeInvoiceFormData());

    expect(invoiceInfra.createCallArgs).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC-023: 正常入力で記録 Action を呼ぶと usecase が実行されパスが revalidate される
// ---------------------------------------------------------------------------

describe("TC-023: recordContractAdjustmentAction — 成功", () => {
  it("usecase を呼び出し、revalidatePath を実行し、空オブジェクトを返す", async () => {
    authState.sessionUserId = "user-admin";
    authState.sessionUserRole = "admin";
    contractInfra.contract = makeContract();
    contractInfra.createdInteraction = makeInteraction("contract");

    const result = await recordContractAdjustmentAction({}, makeContractFormData());

    expect(result).toEqual({});
    expect(contractInfra.createCallArgs).not.toBeNull();
    expect(revalidatedPaths).toContain(`/contracts/${VALID_CONTRACT_ID}`);
  });

  it("usecase に contractId・organizationId・summary が渡される", async () => {
    authState.sessionUserId = "user-admin";
    authState.sessionUserRole = "admin";
    contractInfra.contract = makeContract();
    contractInfra.createdInteraction = makeInteraction("contract");

    await recordContractAdjustmentAction({}, makeContractFormData());

    expect(contractInfra.createCallArgs?.contractId).toBe(VALID_CONTRACT_ID);
    expect(contractInfra.createCallArgs?.organizationId).toBe("org-001");
    expect(contractInfra.createCallArgs?.summary).toBe("条件変更の交渉");
  });
});

describe("TC-023: recordInvoiceAdjustmentAction — 成功", () => {
  it("usecase を呼び出し、revalidatePath を実行し、空オブジェクトを返す", async () => {
    authState.sessionUserId = "user-admin";
    authState.sessionUserRole = "admin";
    invoiceInfra.invoice = makeInvoice();
    invoiceInfra.createdInteraction = makeInteraction("invoice");

    const result = await recordInvoiceAdjustmentAction({}, makeInvoiceFormData());

    expect(result).toEqual({});
    expect(invoiceInfra.createCallArgs).not.toBeNull();
    expect(revalidatedPaths).toContain(
      `/contracts/${VALID_CONTRACT_ID}/invoices/${VALID_INVOICE_ID}`
    );
    expect(revalidatedPaths).toContain(`/contracts/${VALID_CONTRACT_ID}`);
  });

  it("usecase に invoiceId・organizationId・summary が渡される", async () => {
    authState.sessionUserId = "user-admin";
    authState.sessionUserRole = "admin";
    invoiceInfra.invoice = makeInvoice();
    invoiceInfra.createdInteraction = makeInteraction("invoice");

    await recordInvoiceAdjustmentAction({}, makeInvoiceFormData());

    expect(invoiceInfra.createCallArgs?.invoiceId).toBe(VALID_INVOICE_ID);
    expect(invoiceInfra.createCallArgs?.organizationId).toBe("org-001");
    expect(invoiceInfra.createCallArgs?.summary).toBe("請求金額の調整");
  });
});
