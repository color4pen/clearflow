import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("updateInquiryAction ロールチェック静的検証", () => {
  /**
   * TC-019: updateInquiryAction が canPerform で権限チェックを行う
   */
  it('TC-019: canPerform を使ったロールチェックがある', async () => {
    const content = await readSrc("app/actions/inquiries.ts");
    expect(content).toContain('canPerform');
    expect(content).toContain('@/domain/authorization');
  });

  it('TC-019: 権限エラー時に "この操作を実行する権限がありません" を返すコードが含まれる', async () => {
    const content = await readSrc("app/actions/inquiries.ts");
    expect(content).toContain('{ message: "この操作を実行する権限がありません" }');
  });
});

describe("updateMeetingAction ロールチェック静的検証", () => {
  /**
   * TC-030: updateMeetingAction が canPerform で権限チェックを行う
   */
  it('TC-030: canPerform を使ったロールチェックがある', async () => {
    const content = await readSrc("app/actions/meetings.ts");
    expect(content).toContain('canPerform');
    expect(content).toContain('@/domain/authorization');
  });

  it('TC-030: 権限エラー時に "この操作を実行する権限がありません" を返すコードが含まれる', async () => {
    const content = await readSrc("app/actions/meetings.ts");
    expect(content).toContain('{ message: "この操作を実行する権限がありません" }');
  });
});
