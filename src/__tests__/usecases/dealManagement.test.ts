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

  it("recordAudit の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createDeal.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("recordAudit");
  });

  it("clientId なし（inquiryId なし）の場合にエラーを返す分岐がある", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createDeal.ts");
    // 実行・検証 - clientId 必須チェックがある（直接作成パターン）
    expect(content).toContain("clientId");
    expect(content).toContain("clientRepository.findById");
  });
});

describe("updateDealPhase usecase 静的検証", () => {
  it("canDealTransition または canTransition の呼び出しが含まれる（遷移バリデーション）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - 遷移チェックがある
    expect(content.includes("canDealTransition") || content.includes("canTransition")).toBe(true);
  });

  it("recordAudit の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("recordAudit");
  });

  it("requestRepository.create が呼ばれない（estimate_approval 分岐の撤去確認）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - 承認リクエスト作成が存在しない
    expect(content).not.toContain("requestRepository.create");
  });
});

describe("dealRepository 静的検証", () => {
  it("findAllByOrganization の結果に inquiryTitle と clientName が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    // 実行・検証 - inquiries JOIN と clients JOIN および返却フィールドが存在する
    expect(content).toContain("inquiryTitle");
    expect(content).toContain("clientName");
    // 両テーブルへの JOIN が存在する
    expect(content).toContain("inquiries");
    expect(content).toContain("clients");
  });

  it("create に clientId が必須パラメータとして存在する", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    // 実行・検証 - clientId が create シグネチャに含まれる
    const createIdx = content.indexOf("export async function create(");
    expect(createIdx).toBeGreaterThan(-1);
    const createBody = content.slice(createIdx, createIdx + 400);
    expect(createBody).toContain("clientId");
  });

  it("findAllByOrganization が DealWithDetails を返す（DealWithInquiry を使用しない）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    // 実行・検証 - DealWithDetails 型が使用されている
    expect(content).toContain("DealWithDetails");
    expect(content).not.toContain("DealWithInquiry");
  });
});

describe("dealTransition 静的検証", () => {
  it("canTransition が終端チェックのみを行う（VALID_TRANSITIONS マップなし）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("domain/services/dealTransition.ts");
    // 実行・検証 - VALID_TRANSITIONS マップが存在しない
    expect(content).not.toContain("VALID_TRANSITIONS");
  });

  it("canTransition が won/lost からの遷移を拒否する（TERMINAL_PHASES チェックあり）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("domain/services/dealTransition.ts");
    // 実行・検証 - 終端状態チェックがある
    expect(content).toContain("won");
    expect(content).toContain("lost");
  });
});

describe("updateDeal usecase 静的検証", () => {
  it("recordAudit の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDeal.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("recordAudit");
  });
});

describe("Deal domain model description 静的検証", () => {
  it("Deal 型に description フィールドが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("domain/models/deal.ts");
    // 実行・検証 - description が含まれる
    expect(content).toContain("description: string | null");
  });

  it("createDeal の引数に description が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createDeal.ts");
    // 実行・検証 - description が含まれる
    expect(content).toContain("description");
  });

  it("updateDeal の引数に description が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateDeal.ts");
    // 実行・検証 - description が含まれる
    expect(content).toContain("description");
  });

  it("dealRepository の create に description が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    // 実行・検証 - description が含まれる
    expect(content).toContain("description");
  });

  it("createDealSchema に description が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/deals.ts");
    // 実行・検証 - description が含まれる
    const schemaIdx = content.indexOf("const createDealSchema");
    expect(schemaIdx).toBeGreaterThan(-1);
    const schemaBody = content.slice(schemaIdx, schemaIdx + 600);
    expect(schemaBody).toContain("description");
  });
});

describe("deals Server Action ロールチェック静的検証", () => {
  it("createDealAction に canPerform ロールチェックが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/deals.ts");
    // 実行・検証 - canPerform ロールチェックがある
    expect(content).toContain('canPerform');
    expect(content).toContain('@/domain/authorization');
    // createDealAction 内にロールチェックがあることを確認
    const createActionIdx = content.indexOf("async function createDealAction");
    expect(createActionIdx).toBeGreaterThan(-1);
    const createActionBody = content.slice(createActionIdx, createActionIdx + 600);
    expect(createActionBody).toContain('canPerform');
  });

  it("updateDealPhaseAction に canPerform ロールチェックが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/deals.ts");
    // 実行・検証 - updateDealPhaseAction にロールチェックがある
    const phaseActionIdx = content.indexOf("async function updateDealPhaseAction");
    expect(phaseActionIdx).toBeGreaterThan(-1);
    const phaseActionBody = content.slice(phaseActionIdx, phaseActionIdx + 600);
    expect(phaseActionBody).toContain('canPerform');
  });

  it("createDealAction スキーマで inquiryId が optional である", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/deals.ts");
    // 実行・検証 - inquiryId が optional スキーマになっている
    expect(content).toContain("inquiryId");
    // .optional() が含まれる
    const schemaIdx = content.indexOf("const createDealSchema");
    const schemaBody = content.slice(schemaIdx, schemaIdx + 600);
    expect(schemaBody).toContain("optional()");
  });

  it("createDealAction で clientId が DealWithDetails 型で返却される", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/deals.ts");
    // 実行・検証 - DealWithDetails 型が使用されている
    expect(content).toContain("DealWithDetails");
    expect(content).not.toContain("DealWithInquiry");
  });
});
