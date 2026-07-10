/**
 * SidebarNav 静的検証テスト
 *
 * SidebarNav.tsx のソース内容を静的解析し、セクション構成・アイコン・
 * activeスタイル・バッジ定義が仕様通りであることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

const SRC_PATH = "app/(dashboard)/SidebarNav.tsx";

describe("SidebarNav 静的検証", () => {
  it("セクションラベル「メイン」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("メイン");
  });

  it("セクションラベル「営業」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("営業");
  });

  it("セクションラベル「管理」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("管理");
  });

  it("セクションラベル「個人・設定」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("個人・設定");
  });

  it("絵文字アイコン「📊」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("📊");
  });

  it("絵文字アイコン「🏢」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("🏢");
  });

  it("絵文字アイコン「📨」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("📨");
  });

  it("絵文字アイコン「💼」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("💼");
  });

  it("絵文字アイコン「📋」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("📋");
  });

  it("絵文字アイコン「📁」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("📁");
  });

  it("絵文字アイコン「💰」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("💰");
  });

  it("絵文字アイコン「📝」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("📝");
  });

  it("絵文字アイコン「👤」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("👤");
  });

  it("絵文字アイコン「⚙️」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("⚙️");
  });

  it("絵文字アイコン「🧾」が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("🧾");
  });

  it("active スタイルに border-primary が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("border-primary");
  });

  it("旧 active スタイル border-l-2 border-white が含まれない", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).not.toContain("border-l-2 border-white");
  });

  it("badgeCount という文字列が含まれる（props 定義確認）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("badgeCount");
  });

  it("バッジピルに bg-danger が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bg-danger");
  });

  it("バッジ形状に rounded-full が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("rounded-full");
  });
});
