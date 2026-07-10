/**
 * Toast 静的検証テスト
 *
 * Toast.tsx のソース内容を静的解析し、位置・配色・プレフィックス・
 * アニメーション・左カラーバー廃止が仕様通りであることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

const SRC_PATH = "app/components/Toast.tsx";

describe("Toast 静的検証", () => {
  it("bottom-4 が含まれる（右下配置）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bottom-4");
  });

  it("right-4 が含まれる（右下配置）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("right-4");
  });

  it("top-4 が含まれない（右上配置の廃止）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).not.toContain("top-4");
  });

  it("bg-bg-toast が含まれる（ダーク地背景）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bg-bg-toast");
  });

  it("success プレフィックス「✓」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("✓");
  });

  it("error プレフィックス「✗」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("✗");
  });

  it("border-l-4 が含まれない（左カラーバー廃止）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).not.toContain("border-l-4");
  });

  it("toast-slide-in アニメーション参照が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("toast-slide-in");
  });
});
