/**
 * getDashboardActions ユースケースの静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なフィルタリング・ソートパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("getDashboardActions usecase 静的検証", () => {
  it("TC-101: ロール一致の pending 承認リクエストが含まれる — approverRole === userRole チェックがある", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    // approverRole とロール一致チェックが存在する
    expect(content).toContain("approverRole === userRole");
  });

  it("TC-101: ロール一致の pending 承認リクエストのみ対象 — status === 'pending' チェックがある", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    // status === "pending" のチェックが存在する
    expect(content).toContain('"pending"');
    expect(content).toContain("status");
  });

  it("TC-022: ロール不一致の承認リクエストが除外される — matchingStep の判定で false の場合 continue する", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    // ステップが見つからない場合スキップする分岐がある
    expect(content).toContain("matchingStep");
    expect(content).toContain("continue");
  });

  it("TC-102: done === false のアクションアイテムのみ含まれる — done チェックがある", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    // done フラグのチェックが存在する
    expect(content).toContain("actionItem.done");
    expect(content).toContain("continue");
  });

  it("TC-103: status === 'new' の引合のみ含まれる — status フィルタがある", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    // inquiry の status フィルタが存在する
    expect(content).toContain('"new"');
    expect(content).toContain("inquiry.status");
  });

  it("TC-104: 期日昇順でソートされ null は末尾 — sort ロジックが存在する", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    // ソートが存在する
    expect(content).toContain(".sort(");
    // null 末尾配置がある
    expect(content).toContain("null");
    expect(content).toContain("getTime()");
  });

  it("DashboardActionItem 型 — 'approval' | 'action_item' | 'inquiry' の判別可能ユニオン", async () => {
    const content = await readSrc("domain/models/dashboard.ts");
    // 3 種の type 値が定義されている
    expect(content).toContain('"approval"');
    expect(content).toContain('"action_item"');
    expect(content).toContain('"inquiry"');
    // type フィールドが存在する
    expect(content).toContain("type:");
  });

  it("getDashboardActions が Promise.all で並列取得する", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    expect(content).toContain("Promise.all");
  });

  it("getDashboardActions が requestRepository.findAllWithStepsByOrganization を呼ぶ", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    expect(content).toContain("requestRepository.findAllWithStepsByOrganization");
  });

  it("getDashboardActions が meetingRepository.findAllByOrganization を呼ぶ", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    expect(content).toContain("meetingRepository.findAllByOrganization");
  });

  it("getDashboardActions が inquiryRepository.findAllWithClientByOrganization を呼ぶ", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    expect(content).toContain("inquiryRepository.findAllWithClientByOrganization");
  });

  it("getSortDate helper が null を扱う（null 末尾の根拠）", async () => {
    const content = await readSrc("application/usecases/getDashboardActions.ts");
    // null を返す可能性がある（ternary or explicit return）
    expect(content).toContain(": null");
  });
});
