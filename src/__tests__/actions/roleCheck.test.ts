import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("updateInquiryAction ロールチェック静的検証", () => {
  /**
   * TC-019: updateInquiryAction が member ロールに権限エラーを返す
   */
  it('TC-019: member ロール拒否の条件式が含まれる（admin/manager 以外はアクセス不可）', async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/inquiries.ts");
    // 実行・検証 - admin/manager 以外を弾くロールチェックがある
    expect(content).toContain('"admin"');
    expect(content).toContain('"manager"');
    expect(content).toContain('session.user.role !== "admin" && session.user.role !== "manager"');
  });

  it('TC-019: member ロール拒否時に "権限がありません" を返すコードが含まれる', async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/inquiries.ts");
    // 実行・検証 - 権限エラーメッセージが返される
    expect(content).toContain('{ message: "権限がありません" }');
  });
});

describe("updateMeetingAction ロールチェック静的検証", () => {
  /**
   * TC-030: updateMeetingAction が member ロールに権限エラーを返す
   */
  it('TC-030: member ロール拒否の条件式が含まれる（admin/manager 以外はアクセス不可）', async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/meetings.ts");
    // 実行・検証 - admin/manager 以外を弾くロールチェックがある
    expect(content).toContain('"admin"');
    expect(content).toContain('"manager"');
    expect(content).toContain('session.user.role !== "admin" && session.user.role !== "manager"');
  });

  it('TC-030: member ロール拒否時に "権限がありません" を返すコードが含まれる', async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/meetings.ts");
    // 実行・検証 - 権限エラーメッセージが返される
    expect(content).toContain('{ message: "権限がありません" }');
  });
});
