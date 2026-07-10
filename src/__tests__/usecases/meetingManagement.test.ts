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
  it("T-01: dealId と inquiryId の両方がパラメータとして含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - dealId と inquiryId の両方が含まれる
    expect(content).toContain("dealId");
    expect(content).toContain("inquiryId");
  });

  it("T-01b: dealId も inquiryId もない場合にエラーを返すコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - 両方 null のバリデーションがある
    expect(content).toContain("!data.dealId && !data.inquiryId");
  });

  it("T-01c: inquiryId 指定時に inquiryRepository.findById で引合存在確認するコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - 引合存在確認がある
    expect(content).toContain("inquiryRepository.findById");
  });

  it("T-02: dealId 指定時に dealRepository.findById で案件存在確認するコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - 案件存在確認がある
    expect(content).toContain("dealRepository.findById");
  });

  it("T-03: interactionRepository.create 呼び出しに dealId と inquiryId が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - dealId と inquiryId が create に渡される
    expect(content).toContain("dealId:");
    expect(content).toContain("inquiryId:");
  });

  it("recordAudit の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createMeeting.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("recordAudit");
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
  it("interactionRepository.findById の呼び出しが含まれる（存在確認）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateMeeting.ts");
    // 実行・検証 - 商談存在確認がある
    expect(content).toContain("interactionRepository.findById");
  });

  it("recordAudit の呼び出しが含まれる（監査ログ記録）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/updateMeeting.ts");
    // 実行・検証 - 監査ログ記録がある
    expect(content).toContain("recordAudit");
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
  it("interactionRepository.findAllByDeal の呼び出しが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/listMeetings.ts");
    // 実行・検証 - リポジトリ呼び出しがある
    expect(content).toContain("interactionRepository.findAllByDeal");
  });
});

describe("Interaction domain model 静的検証（旧 Meeting domain model）", () => {
  it("MeetingAttendee 型が userId / contactId / name / isExternal を持つ", async () => {
    // 準備 - ソースファイルを読み込む（Meeting = Interaction のため interaction.ts を検証）
    const content = await readSrc("domain/models/interaction.ts");
    // 実行・検証 - MeetingAttendee 型が定義されている
    expect(content).toContain("MeetingAttendee");
    expect(content).toContain("userId");
    expect(content).toContain("contactId");
    expect(content).toContain("isExternal");
    // 旧型が存在しない
    expect(content).not.toContain("MeetingAttendees");
  });

  it("Interaction 型の attendees が MeetingAttendee[] 型である", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("domain/models/interaction.ts");
    // 実行・検証 - attendees が配列型
    expect(content).toContain("attendees: MeetingAttendee[]");
  });

  it("Interaction 型の dealId が nullable である", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("domain/models/interaction.ts");
    // 実行・検証 - dealId が string | null
    expect(content).toContain("dealId: string | null");
  });

  it("Interaction 型に inquiryId が含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("domain/models/interaction.ts");
    // 実行・検証 - inquiryId が string | null
    expect(content).toContain("inquiryId: string | null");
  });

  it("meeting.ts が Interaction を Meeting として再エクスポートしている", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("domain/models/meeting.ts");
    // 実行・検証 - re-export が含まれる
    expect(content).toContain("MeetingAttendee");
    expect(content).toContain("interaction");
  });
});

describe("interactionRepository 静的検証（旧 meetingRepository）", () => {
  it("findAllByInquiry が実装されている", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("infrastructure/repositories/interactionRepository.ts");
    // 実行・検証 - findAllByInquiry メソッドが存在する
    expect(content).toContain("findAllByInquiry");
  });

  it("MeetingAttendee 型を使用している（MeetingAttendees ではない）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("infrastructure/repositories/interactionRepository.ts");
    // 実行・検証 - 新型が使われている
    expect(content).toContain("MeetingAttendee");
    expect(content).not.toContain("MeetingAttendees");
  });
});

describe("createMeetingAction 静的検証", () => {
  it("社内参加者を新構造（isExternal: false）に変換するコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/meetings.ts");
    // 実行・検証 - 社内参加者の変換がある
    expect(content).toContain("isExternal: false");
  });

  it("社外参加者の解決は usecase に委譲される（action に解決ロジックがない）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/meetings.ts");
    // 実行・検証 - externalContactIds を usecase に渡し、担当者マスタは直接参照しない
    expect(content).toContain("externalContactIds");
    expect(content).not.toContain("listClientContacts");
    expect(content).not.toContain("isExternal: true");
  });

  it("inquiryId が createMeetingSchema に含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/meetings.ts");
    // 実行・検証 - inquiryId フィールドがある
    expect(content).toContain("inquiryId");
  });
});
