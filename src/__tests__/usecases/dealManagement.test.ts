/**
 * 案件管理ユースケースの静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("createDeal usecase 静的検証", () => {
  it("inquiryRepository.findById の呼び出しが含まれる（引き合い存在確認）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createDeal.ts");
    // 実行・検証 - 引き合い存在確認がある
    expect(content).toContain("inquiryRepository.findById");
  });

  it("status 文字列比較（converted チェック）が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createDeal.ts");
    // 実行・検証 - converted ステータスチェックがある
    expect(content).toContain("converted");
  });

  it("dealRepository.findByInquiryId の呼び出しが含まれる（重複チェック）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createDeal.ts");
    // 実行・検証 - 重複チェックがある
    expect(content).toContain("dealRepository.findByInquiryId");
  });

  it("auditLogRepository.create の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createDeal.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("auditLogRepository.create");
  });
});

describe("updateDealPhase usecase 静的検証", () => {
  it("canDealTransition または canTransition の呼び出しが含まれる（遷移バリデーション）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - 遷移チェックがある
    expect(content.includes("canDealTransition") || content.includes("canTransition")).toBe(true);
  });

  it("auditLogRepository.create の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("auditLogRepository.create");
  });

  it("requestRepository.create の呼び出しが含まれる（internal_approval 時の見積承認リクエスト作成）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - 承認リクエスト作成がある
    expect(content).toContain("requestRepository.create");
  });

  it("見積承認リクエストのタイトルパターン「見積承認: 」が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - タイトルパターンがある
    expect(content).toContain("見積承認: ");
  });
});

describe("updateDeal usecase 静的検証", () => {
  it("auditLogRepository.create の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDeal.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("auditLogRepository.create");
  });
});

describe("deals Server Action ロールチェック静的検証", () => {
  it("createDealAction に admin/manager ロールチェックが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/deals.ts");
    // 実行・検証 - admin/manager ロールチェックがある
    expect(content).toContain('"admin"');
    expect(content).toContain('"manager"');
    // createDealAction 内にロールチェックがあることを確認
    const createActionIdx = content.indexOf("async function createDealAction");
    expect(createActionIdx).toBeGreaterThan(-1);
    const createActionBody = content.slice(createActionIdx, createActionIdx + 600);
    expect(createActionBody).toContain('"admin"');
    expect(createActionBody).toContain('"manager"');
  });

  it("updateDealPhaseAction に admin/manager ロールチェックが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/deals.ts");
    // 実行・検証 - updateDealPhaseAction にロールチェックがある
    const phaseActionIdx = content.indexOf("async function updateDealPhaseAction");
    expect(phaseActionIdx).toBeGreaterThan(-1);
    const phaseActionBody = content.slice(phaseActionIdx, phaseActionIdx + 600);
    expect(phaseActionBody).toContain('"admin"');
    expect(phaseActionBody).toContain('"manager"');
  });
});
