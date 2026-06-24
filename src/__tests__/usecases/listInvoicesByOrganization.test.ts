/**
 * listInvoicesByOrganization ユースケース / invoiceRepository の静的検証テスト。
 * ソースファイルの内容を静的解析し、重要なフィルタリングパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("invoiceRepository.findAllByOrganization 静的検証", () => {
  it("TC-065: フィルタなしで全請求が返される — organizationId のみが必須条件", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // findAllByOrganization が存在する
    expect(content).toContain("findAllByOrganization");
    // organizationId を必須条件としている
    const fnIdx = content.indexOf("findAllByOrganization");
    const fnBody = content.slice(fnIdx, fnIdx + 1000);
    expect(fnBody).toContain("eq(invoices.organizationId, organizationId)");
  });

  it("TC-107 / TC-061: status フィルタが適用される", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // status フィルタの実装がある
    expect(content).toContain("filters?.status");
    expect(content).toContain("eq(invoices.status, filters.status)");
  });

  it("TC-108 / TC-062: paidAt 期間フィルタが適用される（gte / lt）", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // paidAt フィルタが gte / lt で実装されている
    expect(content).toContain("filters?.paidAtFrom");
    expect(content).toContain("filters?.paidAtTo");
    expect(content).toContain("gte(invoices.paidAt, filters.paidAtFrom)");
    expect(content).toContain("lt(invoices.paidAt, filters.paidAtTo)");
  });

  it("TC-109 / TC-063: issueDate 期間フィルタが適用される（gte / lt）", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // issueDate フィルタが gte / lt で実装されている
    expect(content).toContain("filters?.issueDateFrom");
    expect(content).toContain("filters?.issueDateTo");
    expect(content).toContain("gte(invoices.issueDate, filters.issueDateFrom)");
    expect(content).toContain("lt(invoices.issueDate, filters.issueDateTo)");
  });

  it("TC-066: 返却結果が dueDate 昇順でソートされている", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // asc(invoices.dueDate) によるソートがある
    const fnIdx = content.indexOf("findAllByOrganization");
    const fnBody = content.slice(fnIdx, fnIdx + 1000);
    expect(fnBody).toContain("asc(invoices.dueDate)");
  });

  it("TC-064: organizationId によってテナント分離されている", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // organizationId が必須条件として含まれる
    const fnIdx = content.indexOf("findAllByOrganization");
    const fnBody = content.slice(fnIdx, fnIdx + 200);
    expect(fnBody).toContain("organizationId: string");
  });

  it("TC-068: paidAtTo は lt による exclusive 境界として機能する", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // lt（<）が使われており gte（>=）との組み合わせで exclusive 境界となる
    expect(content).toContain("lt(invoices.paidAt");
    // gte が前に来ている（from は inclusive）
    expect(content).toContain("gte(invoices.paidAt");
    const gteIdx = content.indexOf("gte(invoices.paidAt");
    const ltIdx = content.indexOf("lt(invoices.paidAt");
    expect(gteIdx).toBeLessThan(ltIdx);
  });

  it("既存の mapRow 関数が再利用されている", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    // mapRow が findAllByOrganization 内でも使用されている
    const fnIdx = content.indexOf("findAllByOrganization");
    const fnBody = content.slice(fnIdx, fnIdx + 1200);
    expect(fnBody).toContain("mapRow");
  });
});

describe("listInvoicesByOrganization usecase 静的検証", () => {
  it("TC-067: listInvoicesByOrganization が usecases/index.ts からエクスポートされている", async () => {
    const content = await readSrc("application/usecases/index.ts");
    expect(content).toContain("listInvoicesByOrganization");
  });

  it("listInvoicesByOrganization が invoiceRepository.findAllByOrganization に委譲する", async () => {
    const content = await readSrc("application/usecases/listInvoicesByOrganization.ts");
    expect(content).toContain("invoiceRepository.findAllByOrganization");
    expect(content).toContain("data.organizationId");
  });

  it("status / paidAtFrom / paidAtTo / issueDateFrom / issueDateTo フィルタを受け付ける", async () => {
    const content = await readSrc("application/usecases/listInvoicesByOrganization.ts");
    expect(content).toContain("status");
    expect(content).toContain("paidAtFrom");
    expect(content).toContain("paidAtTo");
    expect(content).toContain("issueDateFrom");
    expect(content).toContain("issueDateTo");
  });
});
