/**
 * updateClient / updateClientContact ユースケースの動的テスト。
 * 個別ファイルモックで実際にユースケースを実行し、テナントスコープと
 * 監査記録（client.update / client_contact.update）を検証する。
 * 顧客更新は従来 Server Action から repository を直接呼び監査が無かった経路であり、
 * 本ユースケース新設で監査漏れを閉じる。その保証を実行検証で固定する。
 */

import { describe, it, expect, beforeEach, afterAll, mock } from "bun:test";
import type { Client, ClientContact } from "@/domain/models/client";

const state = {
  updateReturns: null as Client | null,
  updateContactReturns: null as ClientContact | null,
  updateArgs: null as { id: string; orgId: string; data: unknown } | null,
  updateContactArgs: null as { contactId: string; clientId: string; orgId: string; data: unknown } | null,
  auditCalls: [] as Record<string, unknown>[],
};

// 実装を捕捉して afterAll で復元し、実 clientRepository / auditRecorder / db を使う
// 他テストへのモック汚染を防ぐ。
import * as clientRepoModule from "@/infrastructure/repositories/clientRepository";
import * as auditModule from "@/application/services/auditRecorder";
import * as dbModule from "@/infrastructure/db";
const realClientRepo = { ...clientRepoModule };
const realAudit = { ...auditModule };
const realDb = { db: dbModule.db };

mock.module("@/infrastructure/db", () => ({
  db: { transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}) },
}));

mock.module("@/infrastructure/repositories/clientRepository", () => ({
  update: async (id: string, orgId: string, data: unknown) => {
    state.updateArgs = { id, orgId, data };
    return state.updateReturns;
  },
  updateContact: async (contactId: string, clientId: string, orgId: string, data: unknown) => {
    state.updateContactArgs = { contactId, clientId, orgId, data };
    return state.updateContactReturns;
  },
  findById: async () => null,
  create: async () => null,
  createContact: async () => null,
  findContactsByClientId: async () => [],
  deleteContact: async () => false,
}));

mock.module("@/application/services/auditRecorder", () => ({
  recordAudit: async (data: Record<string, unknown>) => {
    state.auditCalls.push(data);
  },
}));

const { updateClient } = await import("@/application/usecases/updateClient");
const { updateClientContact } = await import("@/application/usecases/updateClientContact");

afterAll(() => {
  mock.module("@/infrastructure/db", () => realDb);
  mock.module("@/infrastructure/repositories/clientRepository", () => realClientRepo);
  mock.module("@/application/services/auditRecorder", () => realAudit);
});

const ORG = "org-1";
const USER = "user-1";

function client(): Client {
  return {
    id: "client-1",
    organizationId: ORG,
    name: "Acme",
    industry: null,
    size: null,
    address: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

function contact(): ClientContact {
  return {
    id: "contact-1",
    clientId: "client-1",
    name: "Taro",
    department: null,
    position: null,
    email: null,
    phone: null,
    isPrimary: true,
    createdAt: new Date("2026-01-01"),
  };
}

beforeEach(() => {
  state.updateReturns = null;
  state.updateContactReturns = null;
  state.updateArgs = null;
  state.updateContactArgs = null;
  state.auditCalls = [];
});

describe("updateClient", () => {
  it("テナントスコープで更新し、監査 client.update を記録する", async () => {
    state.updateReturns = client();
    const result = await updateClient({
      organizationId: ORG,
      clientId: "client-1",
      data: { name: "Acme 2" },
      userId: USER,
    });
    expect(result.ok).toBe(true);
    expect(state.updateArgs?.orgId).toBe(ORG);
    expect(state.auditCalls).toHaveLength(1);
    expect(state.auditCalls[0]).toMatchObject({
      action: "client.update",
      targetType: "client",
      targetId: "client-1",
      actorId: USER,
      organizationId: ORG,
    });
  });

  it("対象が見つからない（他テナント等）場合は失敗し、監査を記録しない", async () => {
    state.updateReturns = null;
    const result = await updateClient({
      organizationId: ORG,
      clientId: "missing",
      data: { name: "X" },
      userId: USER,
    });
    expect(result.ok).toBe(false);
    expect(state.auditCalls).toHaveLength(0);
  });
});

describe("updateClientContact", () => {
  it("テナントスコープで更新し、監査 client_contact.update を記録する", async () => {
    state.updateContactReturns = contact();
    const result = await updateClientContact({
      organizationId: ORG,
      clientId: "client-1",
      contactId: "contact-1",
      data: { phone: "090" },
      userId: USER,
    });
    expect(result.ok).toBe(true);
    expect(state.updateContactArgs?.orgId).toBe(ORG);
    expect(state.auditCalls).toHaveLength(1);
    expect(state.auditCalls[0]).toMatchObject({
      action: "client_contact.update",
      targetType: "client_contact",
      targetId: "contact-1",
      actorId: USER,
      organizationId: ORG,
    });
  });

  it("isPrimary 省略時は data に isPrimary=undefined を渡す（主担当フラグを保持）", async () => {
    state.updateContactReturns = contact();
    await updateClientContact({
      organizationId: ORG,
      clientId: "client-1",
      contactId: "contact-1",
      data: { phone: "090" },
      userId: USER,
    });
    const passed = state.updateContactArgs?.data as { isPrimary?: boolean };
    expect(passed.isPrimary).toBeUndefined();
  });

  it("対象が見つからない場合は失敗し、監査を記録しない", async () => {
    state.updateContactReturns = null;
    const result = await updateClientContact({
      organizationId: ORG,
      clientId: "client-1",
      contactId: "missing",
      data: { phone: "090" },
      userId: USER,
    });
    expect(result.ok).toBe(false);
    expect(state.auditCalls).toHaveLength(0);
  });
});
