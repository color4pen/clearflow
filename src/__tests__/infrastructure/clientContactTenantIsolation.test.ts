/**
 * clientContact テナント分離の静的検証テスト。
 * repository の各メソッドが organizationId を受け取り、
 * clients テーブルへの join または subquery でテナント分離を強制することを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("clientRepository — findContactsByClientId テナント分離", () => {
  it("findContactsByClientId のシグネチャに organizationId が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function findContactsByClientId(");
    expect(idx).toBeGreaterThan(-1);
    const signature = content.slice(idx, idx + 300);
    expect(signature).toContain("organizationId");
  });

  it("findContactsByClientId のクエリに innerJoin が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function findContactsByClientId(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("innerJoin");
  });

  it("findContactsByClientId のクエリに clients.organizationId が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function findContactsByClientId(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("clients.organizationId");
  });
});

describe("clientRepository — updateContact テナント分離", () => {
  it("updateContact のシグネチャに organizationId が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function updateContact(");
    expect(idx).toBeGreaterThan(-1);
    const signature = content.slice(idx, idx + 300);
    expect(signature).toContain("organizationId");
  });

  it("updateContact の where 条件に organizationId 関連の条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function updateContact(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 800);
    expect(body).toContain("organizationId");
    // clients テーブルへの参照が含まれる（inArray subquery または join）
    expect(body).toContain("clients");
  });
});

describe("clientRepository — deleteContact テナント分離", () => {
  it("deleteContact のシグネチャに organizationId が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function deleteContact(");
    expect(idx).toBeGreaterThan(-1);
    const signature = content.slice(idx, idx + 300);
    expect(signature).toContain("organizationId");
  });

  it("deleteContact の where 条件に organizationId 関連の条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function deleteContact(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 800);
    expect(body).toContain("organizationId");
    // clients テーブルへの参照が含まれる（inArray subquery または join）
    expect(body).toContain("clients");
  });
});

describe("clientRepository — countContactsByClientIds テナント分離", () => {
  it("countContactsByClientIds のシグネチャに organizationId が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function countContactsByClientIds(");
    expect(idx).toBeGreaterThan(-1);
    const signature = content.slice(idx, idx + 300);
    expect(signature).toContain("organizationId");
  });

  it("countContactsByClientIds のクエリに innerJoin が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function countContactsByClientIds(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("innerJoin");
  });

  it("countContactsByClientIds のクエリに clients.organizationId が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function countContactsByClientIds(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("clients.organizationId");
  });
});

describe("呼び出し元 — organizationId 伝搬の静的検証", () => {
  it("listClientContacts usecase が organizationId を引数として受け取る", async () => {
    const content = await readSrc("application/usecases/listClientContacts.ts");
    expect(content).toContain("organizationId");
    expect(content).toContain("findContactsByClientId(clientId, organizationId)");
  });

  it("deleteClientContact usecase が deleteContact に organizationId を渡している", async () => {
    const content = await readSrc("application/usecases/deleteClientContact.ts");
    expect(content).toContain("data.organizationId");
    expect(content).toContain("deleteContact(data.contactId, data.clientId, data.organizationId)");
  });

  it("updateClientContactAction が validatePrimaryUniqueness に session.user.organizationId を渡している", async () => {
    const content = await readSrc("app/actions/clients.ts");
    const idx = content.indexOf("async function updateClientContactAction(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx);
    expect(body).toContain("session.user.organizationId");
    expect(body).toContain("validatePrimaryUniqueness(clientId, session.user.organizationId");
  });

  it("updateClientContactAction が organizationId を session.user.organizationId として渡している", async () => {
    const content = await readSrc("app/actions/clients.ts");
    const idx = content.indexOf("async function updateClientContactAction(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx);
    // updateClientContact ユースケース経由で organizationId が渡されることを確認する（T-14 リファクタ後）
    expect(body).toContain("session.user.organizationId");
  });

  it("clients/[id]/page.tsx が listClientContacts に organizationId を渡している", async () => {
    const content = await readSrc("app/(dashboard)/clients/[id]/page.tsx");
    expect(content).toContain("listClientContacts(id, organizationId)");
  });

  it("deals/[id]/page.tsx が listClientContacts に organizationId を渡している", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/page.tsx");
    expect(content).toContain("listClientContacts(deal.clientId, organizationId)");
  });

  it("deals/[id]/meetings/new/page.tsx が listClientContacts に organizationId を渡している", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/meetings/new/page.tsx");
    expect(content).toContain("listClientContacts(deal.clientId, organizationId)");
  });

  it("deals/[id]/meetings/[meetingId]/page.tsx が listClientContacts に organizationId を渡している", async () => {
    const content = await readSrc("app/(dashboard)/deals/[id]/meetings/[meetingId]/page.tsx");
    expect(content).toContain("listClientContacts(deal.clientId, organizationId)");
  });

  it("createClientContact usecase が validatePrimaryUniqueness に data.organizationId を渡している", async () => {
    const content = await readSrc("application/usecases/createClientContact.ts");
    expect(content).toContain("validatePrimaryUniqueness(data.clientId, data.organizationId");
  });

  it("validatePrimaryUniqueness が organizationId を引数として受け取る", async () => {
    const content = await readSrc("application/services/clientContactService.ts");
    const idx = content.indexOf("export async function validatePrimaryUniqueness(");
    expect(idx).toBeGreaterThan(-1);
    const signature = content.slice(idx, idx + 300);
    expect(signature).toContain("organizationId");
  });

  it("validatePrimaryUniqueness が findContactsByClientId に organizationId を渡している", async () => {
    const content = await readSrc("application/services/clientContactService.ts");
    expect(content).toContain("findContactsByClientId(clientId, organizationId");
  });
});
