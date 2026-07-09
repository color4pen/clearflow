/**
 * StatusBadge コンポーネントの静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

const SRC_PATH = "app/(dashboard)/components/StatusBadge.tsx";

describe("StatusBadge 静的検証", () => {
  it("StatusBadge.tsx が存在する", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content.length).toBeGreaterThan(0);
  });

  it("StatusBadgeVariant がエクスポートされている", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("export type StatusBadgeVariant");
  });

  it('"use client" ディレクティブが存在しない（Server Component 対応）', async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).not.toContain('"use client"');
  });

  it("rounded-full が含まれる（pill 形状）", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("rounded-full");
  });

  it("whitespace-nowrap が含まれる", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("whitespace-nowrap");
  });

  it("gray variant のクラスが存在する", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bg-status-gray-bg");
    expect(content).toContain("text-status-gray-text");
  });

  it("blue variant のクラスが存在する", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bg-status-blue-bg");
    expect(content).toContain("text-status-blue-text");
  });

  it("green variant のクラスが存在する", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bg-status-green-bg");
    expect(content).toContain("text-status-green-text");
  });

  it("yellow variant のクラスが存在する", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bg-status-yellow-bg");
    expect(content).toContain("text-status-yellow-text");
  });

  it("red variant のクラスが存在する", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bg-status-red-bg");
    expect(content).toContain("text-status-red-text");
  });

  it("navy variant のクラスが存在する", async () => {
    const content = await readSrc(SRC_PATH);
    expect(content).toContain("bg-status-navy-bg");
    expect(content).toContain("text-status-navy-text");
  });
});
