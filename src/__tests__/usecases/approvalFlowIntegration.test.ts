/**
 * Approval flow integration tests — static code analysis
 *
 * 承認フローと案件管理ドメインの連携に関する静的検証テスト。
 * ソースコードを読み込み、実装の存在と構造を確認する。
 * ライブ DB を必要としない。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// requestRepository.create のシグネチャ検証
// ---------------------------------------------------------------------------

describe("requestRepository.create signature", () => {
  it("T-03: create メソッドが status パラメータを受け付ける", async () => {
    // 準備 - リポジトリファイルを読み込む
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // 実行・検証 - create 関数の定義内に status が含まれる
    const createIdx = src.indexOf("export async function create(");
    expect(createIdx).toBeGreaterThan(-1);
    const createBody = src.slice(createIdx, createIdx + 600);
    expect(createBody).toContain("status?:");
  });

  it("T-03: status 未指定時のデフォルトが draft である", async () => {
    // 準備 - リポジトリファイルを読み込む
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // 実行・検証 - status: data.status ?? "draft" が存在する
    expect(src).toContain('data.status ?? "draft"');
  });
});

// ---------------------------------------------------------------------------
// createRequest UC が引き続き draft で作成することを確認
// ---------------------------------------------------------------------------

describe("createRequest UC が draft で作成する", () => {
  it("T-03: createRequest が status パラメータを渡していない（デフォルト draft）", async () => {
    // 準備 - createRequest ユースケースを読み込む
    const src = await readSrc("application/usecases/createRequest.ts");
    // 実行・検証 - requestRepository.create 呼び出しに status が指定されていない
    const createCallIdx = src.indexOf("requestRepository.create(");
    expect(createCallIdx).toBeGreaterThan(-1);
    // create 呼び出しの引数ブロック内（300文字）に status: が含まれていない
    const callBlock = src.slice(createCallIdx, createCallIdx + 300);
    expect(callBlock).not.toContain("status:");
  });
});

// ---------------------------------------------------------------------------
// updateInquiryStatus converted 遷移（直接 Deal 作成）
// ---------------------------------------------------------------------------

describe("updateInquiryStatus converted 遷移（直接 Deal 作成）", () => {
  it("converted 遷移で dealRepository.create の呼び出しが含まれる", async () => {
    // 準備 - ユースケースファイルを読み込む
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - dealRepository.create が呼ばれている
    expect(src).toContain("dealRepository.create");
  });

  it("converted 遷移で requestRepository.create の呼び出しが含まれない", async () => {
    // 準備 - ユースケースファイルを読み込む
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - requestRepository.create が存在しない（承認リクエスト作成なし）
    expect(src).not.toContain("requestRepository.create");
  });

  it("converted 遷移で db.transaction が使われている", async () => {
    // 準備 - ユースケースファイルを読み込む
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - Deal 作成とステータス更新が同一トランザクション内
    expect(src).toContain("db.transaction");
  });
});
