/**
 * 引き合い管理ユースケースの静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("updateInquiryStatus usecase 静的検証", () => {
  it("canTransition の呼び出しが含まれる（遷移バリデーション）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - canTransition が呼び出されている
    expect(content).toContain("canTransition");
  });

  it("auditLogRepository.create の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("auditLogRepository.create");
  });

  it("dealRepository.create の呼び出しが含まれる（converted 時の案件直接作成）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - 案件直接作成がある
    expect(content).toContain("dealRepository.create");
  });

  it("db.transaction の呼び出しが含まれる（トランザクション内処理）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - トランザクションが使われている
    expect(content).toContain("db.transaction");
  });
});

describe("createInquiry usecase 静的検証", () => {
  it("auditLogRepository.create の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createInquiry.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("auditLogRepository.create");
  });

  it("clientRepository.findById の呼び出しが含まれる（顧客存在確認）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createInquiry.ts");
    // 実行・検証 - 顧客存在確認がある
    expect(content).toContain("clientRepository.findById");
  });
});

describe("createClient usecase 静的検証", () => {
  it("auditLogRepository.create の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createClient.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("auditLogRepository.create");
  });

  it("db.transaction の呼び出しが含まれる（トランザクション内処理）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createClient.ts");
    // 実行・検証 - トランザクションが使われている
    expect(content).toContain("db.transaction");
  });
});

describe("updateInquiryStatusAction ロールチェック静的検証", () => {
  it("converted 時に canPerform によるロールチェックが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/inquiries.ts");
    // 実行・検証 - canPerform によるロールチェックがある
    // 「converted」への遷移時のロールチェック
    expect(content).toContain('"converted"');
    expect(content).toContain('canPerform');
    expect(content).toContain('"convert"');
  });
});

describe("Inquiry ドメインモデル 静的検証", () => {
  it("InquirySource 型に email と agent_service が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("domain/models/inquiry.ts");
    // 実行・検証 - 7 値すべてが含まれる
    expect(content).toContain('"email"');
    expect(content).toContain('"agent_service"');
    expect(content).toContain('"web"');
    expect(content).toContain('"phone"');
    expect(content).toContain('"referral"');
    expect(content).toContain('"exhibition"');
    expect(content).toContain('"other"');
  });

  it("Inquiry 型に budget と timeline フィールドが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("domain/models/inquiry.ts");
    // 実行・検証 - budget と timeline が含まれる
    expect(content).toContain("budget: number | null");
    expect(content).toContain("timeline: string | null");
  });
});

describe("createInquiry usecase budget/timeline 静的検証", () => {
  it("createInquiry の引数に budget と timeline が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createInquiry.ts");
    // 実行・検証 - budget と timeline が含まれる
    expect(content).toContain("budget");
    expect(content).toContain("timeline");
  });

  it("updateInquiry の引数に budget と timeline が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateInquiry.ts");
    // 実行・検証 - budget と timeline が含まれる
    expect(content).toContain("budget");
    expect(content).toContain("timeline");
  });
});

describe("inquiries action schema 静的検証", () => {
  it("createInquirySchema に budget と timeline が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/inquiries.ts");
    // 実行・検証 - 7 値の enum と budget, timeline が含まれる
    expect(content).toContain('"email"');
    expect(content).toContain('"agent_service"');
    expect(content).toContain("budget");
    expect(content).toContain("timeline");
  });
});

describe("inquirySourceEnum 静的検証", () => {
  it("schema.ts に inquirySourceEnum が pgEnum として定義されている", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("infrastructure/schema.ts");
    // 実行・検証 - pgEnum として定義されている
    expect(content).toContain('inquirySourceEnum');
    expect(content).toContain('"inquiry_source"');
    expect(content).toContain('"email"');
    expect(content).toContain('"agent_service"');
  });
});
