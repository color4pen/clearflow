/**
 * DealActivitySection コンポーネントの静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

const SRC_PATH = "app/(dashboard)/deals/[id]/DealActivitySection.tsx";

// T-06: DealActivitySection の対象ラベル表示
describe("DealActivitySection 静的検証", () => {
  it("targetInfoMap の文字列が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("targetInfoMap");
  });

  it("next/link の import（Link）が含まれる（href ありの対象をリンク表示するため）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("next/link");
  });

  it("href の参照が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("href");
  });

  it("formatRelativeTime の呼び出しが残っている（既存表示の維持）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("formatRelativeTime");
  });

  it("getActionLabel の呼び出しが残っている（既存表示の維持）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("getActionLabel");
  });

  // T-07: フォールバック動作
  it("targetType と targetId を組み合わせたキーでの targetInfoMap ルックアップパターンが含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    // `${log.targetType}:${log.targetId}` のようなルックアップパターンが存在することを確認
    expect(content).toContain("targetType");
    expect(content).toContain("targetId");
    expect(content).toContain("targetInfoMap[");
  });

  it("userMap の参照が残っている（既存の actor 解決が不変）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("userMap");
  });
});
