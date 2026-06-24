/**
 * T-34: ドメインモデル整合の静的型検証テスト。
 * 型定義と export のみを検証する（実行時の動作には依存しない）。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("T-34: 新規追加・変更されたモデル型の静的確認", () => {
  it("Inquiry 型に budget フィールドが存在する", async () => {
    const content = await readSrc("domain/models/inquiry.ts");
    expect(content).toContain("budget");
  });

  it("Inquiry 型に timeline フィールドが存在する", async () => {
    const content = await readSrc("domain/models/inquiry.ts");
    expect(content).toContain("timeline");
  });

  it("InquirySource に 'email' が含まれる", async () => {
    const content = await readSrc("domain/models/inquiry.ts");
    expect(content).toContain('"email"');
  });

  it("InquirySource に 'agent_service' が含まれる", async () => {
    const content = await readSrc("domain/models/inquiry.ts");
    expect(content).toContain('"agent_service"');
  });

  it("InquirySource が 7 値を持つ", async () => {
    const content = await readSrc("domain/models/inquiry.ts");
    const sources = ["web", "phone", "email", "referral", "agent_service", "exhibition", "other"];
    for (const source of sources) {
      expect(content).toContain(`"${source}"`);
    }
  });

  it("Meeting 型に inquiryId フィールドが存在する", async () => {
    const content = await readSrc("domain/models/meeting.ts");
    expect(content).toContain("inquiryId");
  });

  it("Meeting 型の dealId が string | null である", async () => {
    const content = await readSrc("domain/models/meeting.ts");
    expect(content).toContain("dealId: string | null");
  });

  it("MeetingAttendee 型が新設されている", async () => {
    const content = await readSrc("domain/models/meeting.ts");
    expect(content).toContain("MeetingAttendee");
    expect(content).toContain("isExternal");
    expect(content).toContain("userId");
    expect(content).toContain("contactId");
  });

  it("MeetingAttendee が domain/models/index.ts から export されている", async () => {
    const content = await readSrc("domain/models/index.ts");
    expect(content).toContain("MeetingAttendee");
  });

  it("Deal 型に description フィールドが存在する", async () => {
    const content = await readSrc("domain/models/deal.ts");
    expect(content).toContain("description");
  });

  it("Contract 型の amount が non-nullable (number) である", async () => {
    const content = await readSrc("domain/models/contract.ts");
    expect(content).toContain("amount: number;");
    expect(content).not.toContain("amount: number | null");
  });

  it("Contract 型の startDate が non-nullable (Date) である", async () => {
    const content = await readSrc("domain/models/contract.ts");
    expect(content).toContain("startDate: Date;");
    expect(content).not.toContain("startDate: Date | null");
  });

  it("Invoice 型に issueDate フィールドが存在する", async () => {
    const content = await readSrc("domain/models/invoice.ts");
    expect(content).toContain("issueDate");
  });

  it("validatePrimaryUniqueness が domain/services から export されている", async () => {
    const content = await readSrc("domain/services/index.ts");
    expect(content).toContain("validatePrimaryUniqueness");
  });

  it("validatePrimaryUniqueness が純粋関数として実装されている（repository を呼ばない）", async () => {
    const content = await readSrc("domain/services/clientContactService.ts");
    expect(content).toContain("validatePrimaryUniqueness");
    expect(content).not.toContain("repository");
    expect(content).not.toContain("await");
  });

  it("schema.ts に inquirySourceEnum が定義されている", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("inquirySourceEnum");
    expect(content).toContain("pgEnum");
    expect(content).toContain('"agent_service"');
  });

  it("schema.ts の inquiries テーブルに budget カラムが存在する", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain('integer("budget")');
  });

  it("schema.ts の inquiries テーブルに timeline カラムが存在する", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain('text("timeline")');
  });

  it("schema.ts の meetings テーブルに inquiry_id カラムが存在する", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain('uuid("inquiry_id")');
  });

  it("schema.ts の deals テーブルに description カラムが存在する", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain('text("description")');
  });

  it("schema.ts の contracts テーブルの amount が NOT NULL である", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    // amount: integer("amount").notNull() の形式を確認
    expect(content).toContain('integer("amount").notNull()');
  });

  it("schema.ts の invoices テーブルに issue_date カラムが存在する", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain('issue_date');
  });
});

describe("T-34: isPrimary 検証ロジックの静的確認", () => {
  it("validatePrimaryUniqueness が isPrimary=true かつ existingPrimaryCount>0 でエラーを返す実装を持つ", async () => {
    const content = await readSrc("domain/services/clientContactService.ts");
    expect(content).toContain("existingPrimaryCount > 0");
    expect(content).toContain("valid: false");
  });

  it("validatePrimaryUniqueness が isPrimary=false で valid:true を返す実装を持つ", async () => {
    const content = await readSrc("domain/services/clientContactService.ts");
    expect(content).toContain("valid: true");
  });
});

describe("T-35: isPrimary 検証の呼び出し確認", () => {
  it("createClientContact.ts が validatePrimaryUniqueness を呼び出している", async () => {
    const content = await readSrc("application/usecases/createClientContact.ts");
    expect(content).toContain("validatePrimaryUniqueness");
  });

  it("clients.ts の updateClientContactAction が validatePrimaryUniqueness を呼び出している", async () => {
    const content = await readSrc("app/actions/clients.ts");
    expect(content).toContain("validatePrimaryUniqueness");
  });
});
