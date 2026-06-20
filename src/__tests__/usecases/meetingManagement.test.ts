/**
 * 商談管理ユースケースの静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("createMeeting usecase 静的検証", () => {
  it("inquiryRepository.findById の呼び出しが含まれる（引き合い存在確認）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - 引き合い存在確認がある
    expect(content).toContain("inquiryRepository.findById");
  });

  it("auditLogRepository.create の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("auditLogRepository.create");
  });

  it("db.transaction の呼び出しが含まれる（トランザクション内処理）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - トランザクションが使われている
    expect(content).toContain("db.transaction");
  });

  it("hearing 以外の type で hearingData を null に制御するコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - hearingData の null 制御がある
    expect(content).toContain('"hearing"');
    expect(content).toContain("null");
  });
});

describe("updateMeeting usecase 静的検証", () => {
  it("meetingRepository.findById の呼び出しが含まれる（存在確認）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateMeeting.ts");
    // 実行・検証 - 商談存在確認がある
    expect(content).toContain("meetingRepository.findById");
  });

  it("auditLogRepository.create の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateMeeting.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("auditLogRepository.create");
  });

  it("db.transaction の呼び出しが含まれる（トランザクション内処理）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateMeeting.ts");
    // 実行・検証 - トランザクションが使われている
    expect(content).toContain("db.transaction");
  });

  it("hearing 以外の type で hearingData を null に制御するコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateMeeting.ts");
    // 実行・検証 - hearingData の null 制御がある
    expect(content).toContain('"hearing"');
    expect(content).toContain("null");
  });
});

describe("listMeetings usecase 静的検証", () => {
  it("meetingRepository.findAllByInquiry の呼び出しが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/listMeetings.ts");
    // 実行・検証 - リポジトリ呼び出しがある
    expect(content).toContain("meetingRepository.findAllByInquiry");
  });
});
