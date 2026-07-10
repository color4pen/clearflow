/**
 * ConfirmDialog 静的検証テスト
 *
 * ConfirmDialog.tsx のソース内容を静的解析し、BTN定数の使用・角丸・
 * 3分割レイアウト・区切り線が仕様通りであることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

const SRC_PATH = "app/components/ConfirmDialog.tsx";

describe("ConfirmDialog 静的検証", () => {
  it("BTN_SECONDARY が含まれる（キャンセルボタン）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("BTN_SECONDARY");
  });

  it("BTN_PRIMARY が含まれる（確定ボタン）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("BTN_PRIMARY");
  });

  it("BTN_DANGER が含まれる（danger 確定ボタン）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("BTN_DANGER");
  });

  it("rounded-lg が含まれる（本体角丸）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("rounded-lg");
  });

  it("header-body 区切り線 border-b border-border が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("border-b border-border");
  });

  it("body-footer 区切り線 border-t border-border が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("border-t border-border");
  });

  it("bg-black/45 が含まれる（overlay）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bg-black/45");
  });

  it("maxWidth 480 が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("480");
  });
});
