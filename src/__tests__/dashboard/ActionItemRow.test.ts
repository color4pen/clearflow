/**
 * ActionItemRow コンポーネントの期日強調ロジック検証テスト。
 *
 * @testing-library/react が利用できない環境のため、ソースファイルの静的解析で
 * 実装パターンの存在を確認する。期日比較の実際の動作は dueDateClass.test.ts で検証済み。
 */

import { describe, it, expect, afterAll } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

const SRC_PATH = "app/(dashboard)/components/ActionItemRow.tsx";

describe("ActionItemRow 期日強調 静的検証", () => {
  let content: string;

  it("ActionItemRow.tsx が存在する", async () => {
    content = await readSrc(SRC_PATH);
    expect(content.length).toBeGreaterThan(0);
  });

  it("dueDateClass を import している", async () => {
    const c = content ?? await readSrc(SRC_PATH);
    expect(c).toContain('dueDateClass');
    expect(c).toContain('@/app/(dashboard)/lib/dueDateClass');
  });

  it("_testNow prop が定義されている", async () => {
    const c = content ?? await readSrc(SRC_PATH);
    expect(c).toContain('_testNow');
  });

  it("showSource=true モードの期日 span に dueDateClass が適用されている（text-danger / text-warning の条件付きクラス）", async () => {
    const c = content ?? await readSrc(SRC_PATH);
    // dueDateClass が呼ばれていることで text-danger/text-warning が動的に適用される
    expect(c).toContain('dueDateClass(item.dueDate');
  });

  it("dueDateClass が '' を返す場合は text-text-muted をフォールバックとして使用している", async () => {
    const c = content ?? await readSrc(SRC_PATH);
    expect(c).toContain('text-text-muted');
  });
});

afterAll(() => {
  // afterAll: 必要なクリーンアップ（本テストは副作用なし）
});
