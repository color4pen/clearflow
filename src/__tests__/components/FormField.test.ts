/**
 * FormField 静的検証テスト
 *
 * FormField.tsx のソース内容を静的解析し、required props・invalid props・
 * FORM_LABEL 参照・Textarea の min-h-20 が仕様通りであることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

const SRC_PATH = "app/components/FormField.tsx";

describe("FormField 静的検証", () => {
  it("FORM_LABEL のインポートが含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("FORM_LABEL");
  });

  it("FormField に required props 定義が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("required");
  });

  it("required=true のとき * スパンに text-danger が使用される", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("text-danger");
  });

  it("required と * の表示ロジックが含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("required &&");
    expect(content).toContain(" *");
  });
});

describe("Input 静的検証", () => {
  it("invalid props 定義が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("invalid");
  });

  it("invalid=true のとき border-danger が適用される", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("border-danger");
  });
});

describe("Textarea 静的検証", () => {
  it("min-h-20 が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("min-h-20");
  });
});
