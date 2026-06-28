/**
 * watch/unwatch/getWatchStatus usecase の静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("watchRepository 静的検証", () => {
  it("create 関数が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/watchRepository.ts");
    expect(content).toContain("export async function create(");
  });

  it("findByUserAndDeal 関数が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/watchRepository.ts");
    expect(content).toContain("export async function findByUserAndDeal(");
  });

  it("findByUser 関数が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/watchRepository.ts");
    expect(content).toContain("export async function findByUser(");
  });

  it("deleteByUserAndDeal 関数が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/watchRepository.ts");
    expect(content).toContain("export async function deleteByUserAndDeal(");
  });

  it("create が onConflictDoNothing（冪等）を使う", async () => {
    const content = await readSrc("infrastructure/repositories/watchRepository.ts");
    expect(content).toContain("onConflictDoNothing");
  });

  it("全関数に organizationId 条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/watchRepository.ts");
    // 少なくとも4箇所以上 organizationId が使われていることを確認
    const matches = content.match(/organizationId/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(4);
  });

  it("watches テーブルの eq(watches.organizationId, organizationId) が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/watchRepository.ts");
    expect(content).toContain("watches.organizationId");
  });
});

describe("watchDeal usecase 静的検証", () => {
  it("watchRepository.create の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/watchDeal.ts");
    expect(content).toContain("watchRepository.create");
  });

  it("organizationId が必須パラメータとして含まれる", async () => {
    const content = await readSrc("application/usecases/watchDeal.ts");
    expect(content).toContain("organizationId");
  });
});

describe("unwatchDeal usecase 静的検証", () => {
  it("watchRepository.deleteByUserAndDeal の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/unwatchDeal.ts");
    expect(content).toContain("watchRepository.deleteByUserAndDeal");
  });

  it("organizationId が必須パラメータとして含まれる", async () => {
    const content = await readSrc("application/usecases/unwatchDeal.ts");
    expect(content).toContain("organizationId");
  });
});

describe("getWatchStatus usecase 静的検証", () => {
  it("watchRepository.findByUserAndDeal の呼び出しが含まれる", async () => {
    const content = await readSrc("application/usecases/getWatchStatus.ts");
    expect(content).toContain("watchRepository.findByUserAndDeal");
  });

  it("organizationId が必須パラメータとして含まれる", async () => {
    const content = await readSrc("application/usecases/getWatchStatus.ts");
    expect(content).toContain("organizationId");
  });

  it("isWatching を返す", async () => {
    const content = await readSrc("application/usecases/getWatchStatus.ts");
    expect(content).toContain("isWatching");
  });
});

describe("watchRepository index export 静的検証", () => {
  it("watchRepository が repositories/index.ts からエクスポートされている", async () => {
    const content = await readSrc("infrastructure/repositories/index.ts");
    expect(content).toContain("watchRepository");
  });
});

describe("watches テーブルスキーマ静的検証", () => {
  it("watches テーブルが schema.ts に定義されている", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain('export const watches = pgTable(');
  });

  it("(userId, dealId) ユニーク制約が含まれる", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("watches_user_deal_unique");
  });

  it("organizationId カラムが含まれる", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    // watches テーブル定義内に organization_id が存在することを確認
    const watchesStart = content.indexOf("export const watches = pgTable(");
    const watchesBody = content.slice(watchesStart, watchesStart + 600);
    expect(watchesBody).toContain("organization_id");
  });

  it("(organizationId, userId) インデックスが含まれる", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("watches_org_user_idx");
  });

  it("watchesRelations が定義されている", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("watchesRelations");
  });

  it("organizationsRelations に watches が含まれる", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    const relIdx = content.indexOf("organizationsRelations");
    const relBody = content.slice(relIdx, relIdx + 1200);
    expect(relBody).toContain("watches");
  });

  it("usersRelations に watches が含まれる", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    const relIdx = content.indexOf("usersRelations");
    const relBody = content.slice(relIdx, relIdx + 1500);
    expect(relBody).toContain("watches");
  });

  it("dealsRelations に watches が含まれる", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    const relIdx = content.indexOf("dealsRelations");
    const relBody = content.slice(relIdx, relIdx + 1000);
    expect(relBody).toContain("watches");
  });
});

describe("watch actions 静的検証", () => {
  it("watchDealAction が watches.ts に含まれる", async () => {
    const content = await readSrc("app/actions/watches.ts");
    expect(content).toContain("watchDealAction");
  });

  it("unwatchDealAction が watches.ts に含まれる", async () => {
    const content = await readSrc("app/actions/watches.ts");
    expect(content).toContain("unwatchDealAction");
  });

  it("watches.ts に認証チェックが含まれる", async () => {
    const content = await readSrc("app/actions/watches.ts");
    expect(content).toContain("session");
    expect(content).toContain("auth()");
  });

  it("watches.ts に revalidatePath が含まれる", async () => {
    const content = await readSrc("app/actions/watches.ts");
    expect(content).toContain("revalidatePath");
  });

  it("organizationId をセッションから取得する（リクエストボディから受け取らない）", async () => {
    const content = await readSrc("app/actions/watches.ts");
    // organizationId はセッションから取得
    expect(content).toContain("session.user.organizationId");
  });
});
