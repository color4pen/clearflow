/**
 * clientContactService の静的検証テスト。
 * ソースファイルの内容を静的解析し、validatePrimaryUniqueness の重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("clientContactService 静的検証", () => {
  it("validatePrimaryUniqueness 関数が application/services に存在する（domain/services ではない）", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/services/clientContactService.ts");
    // 実行・検証 - 関数が存在する
    expect(content).toContain("validatePrimaryUniqueness");
  });

  it("isPrimary=false の場合は即座に成功を返すコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/services/clientContactService.ts");
    // 実行・検証 - isPrimary=false の早期リターンがある
    expect(content).toContain("if (!isPrimary)");
    expect(content).toContain('return { ok: true }');
  });

  it("isPrimary=true の場合に clientRepository.findContactsByClientId で既存レコードを検索するコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/services/clientContactService.ts");
    // 実行・検証 - clientRepository 検索がある
    expect(content).toContain("clientRepository.findContactsByClientId");
    expect(content).toContain("isPrimary");
  });

  it("既存の primary が存在する場合はエラーを返すコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/services/clientContactService.ts");
    // 実行・検証 - エラー返却がある
    expect(content).toContain('ok: false');
    expect(content).toContain("既に主担当者");
  });

  it("contactId が指定されている場合（更新時）は自身を除外するコードが含まれる", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/services/clientContactService.ts");
    // 実行・検証 - 自身の除外ロジックがある
    expect(content).toContain("c.id !== contactId");
  });

  it("Transaction 型を引数として受け取る", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/services/clientContactService.ts");
    // 実行・検証 - tx パラメータがある
    expect(content).toContain("tx?: Transaction");
  });
});

describe("createClientContact usecase isPrimary 静的検証", () => {
  it("isPrimary パラメータを受け取る", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createClientContact.ts");
    // 実行・検証 - isPrimary が含まれる
    expect(content).toContain("isPrimary");
  });

  it("db.transaction ブロックを持つ", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createClientContact.ts");
    // 実行・検証 - トランザクションが使われている
    expect(content).toContain("db.transaction");
  });

  it("validatePrimaryUniqueness を呼び出す", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("application/usecases/createClientContact.ts");
    // 実行・検証 - validatePrimaryUniqueness が呼び出されている
    expect(content).toContain("validatePrimaryUniqueness");
  });
});

describe("updateClientContactAction isPrimary 静的検証", () => {
  it("updateClientContactAction が validatePrimaryUniqueness を呼び出す", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/clients.ts");
    // 実行・検証 - validatePrimaryUniqueness が呼び出されている
    expect(content).toContain("validatePrimaryUniqueness");
  });

  it("isPrimary 重複チェックがエラー時にエラーを返す", async () => {
    // 準備 - ソースファイルを読み込む
    const content = await readSrc("app/actions/clients.ts");
    // 実行・検証 - バリデーション結果のチェックがある
    expect(content).toContain("primaryValidation.ok");
    expect(content).toContain("primaryValidation.reason");
  });
});
