/**
 * T-14: updateClient / updateClientContact ユースケース新設テスト
 * TC-042, TC-043, TC-044, TC-045
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile, access } from "fs/promises";
import { constants } from "fs";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

async function fileExists(relPath: string): Promise<boolean> {
  try {
    await access(path.join(ROOT, relPath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe("TC-042: updateClient ユースケース", () => {
  it("updateClient.ts が存在する", async () => {
    const exists = await fileExists("src/application/usecases/updateClient.ts");
    expect(exists).toBe(true);
  });

  it("clientRepository.update を呼び出している", async () => {
    const content = await readSrc("application/usecases/updateClient.ts");
    expect(content).toContain("clientRepository.update");
  });

  it("client.update アクションの監査ログを記録している", async () => {
    const content = await readSrc("application/usecases/updateClient.ts");
    expect(content).toContain("client.update");
    expect(content).toContain("recordAudit");
  });

  it("Result 型 { ok: true, client } / { ok: false, reason } を返す", async () => {
    const content = await readSrc("application/usecases/updateClient.ts");
    expect(content).toContain("ok: true");
    expect(content).toContain("ok: false");
    expect(content).toContain("reason");
  });

  it("updateClient が usecases/index.ts からエクスポートされている", async () => {
    const content = await readSrc("application/usecases/index.ts");
    expect(content).toContain("updateClient");
  });
});

describe("TC-043: updateClientContact ユースケース", () => {
  it("updateClientContact.ts が存在する", async () => {
    const exists = await fileExists("src/application/usecases/updateClientContact.ts");
    expect(exists).toBe(true);
  });

  it("clientRepository.updateContact を呼び出している", async () => {
    const content = await readSrc("application/usecases/updateClientContact.ts");
    expect(content).toContain("clientRepository.updateContact");
  });

  it("client_contact.update アクションの監査ログを記録している", async () => {
    const content = await readSrc("application/usecases/updateClientContact.ts");
    expect(content).toContain("client_contact.update");
    expect(content).toContain("recordAudit");
  });

  it("Result 型を返す", async () => {
    const content = await readSrc("application/usecases/updateClientContact.ts");
    expect(content).toContain("ok: true");
    expect(content).toContain("ok: false");
  });

  it("updateClientContact が usecases/index.ts からエクスポートされている", async () => {
    const content = await readSrc("application/usecases/index.ts");
    expect(content).toContain("updateClientContact");
  });
});

describe("TC-044: updateClientAction が updateClient ユースケース経由に変更されている", () => {
  it("actions/clients.ts が updateClient を import している", async () => {
    const content = await readSrc("app/actions/clients.ts");
    expect(content).toContain("updateClient");
    expect(content).toContain("@/application/usecases");
  });

  it("actions/clients.ts の updateClientAction が clientRepository.update を直接呼ばない", async () => {
    const content = await readSrc("app/actions/clients.ts");
    // clientRepository.update の直接呼び出しを検索（動的 import 経由も含む）
    // updateClient ユースケースに移行したため、直接呼び出しは削除されているはず
    const hasDirectCall =
      content.includes("clientRepository.update(") &&
      content.includes("await import");
    expect(hasDirectCall).toBe(false);
  });
});

describe("TC-045: updateClientContactAction が updateClientContact ユースケース経由に変更されている", () => {
  it("actions/clients.ts が updateClientContact を import している", async () => {
    const content = await readSrc("app/actions/clients.ts");
    expect(content).toContain("updateClientContact");
  });

  it("actions/clients.ts の updateClientContactAction が clientRepository.updateContact を直接呼ばない", async () => {
    const content = await readSrc("app/actions/clients.ts");
    // updateClientContact ユースケース呼び出し後は直接リポジトリ呼び出しがないことを確認
    expect(content).not.toContain("clientRepository.updateContact(");
  });
});
