/**
 * linkTargetSearch — 検索機能の静的検証テスト
 *
 * ソースファイルの内容を静的解析し、重要なパターンが含まれることを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile, access } from "fs/promises";
import { constants } from "fs";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

async function fileExists(relPath: string): Promise<boolean> {
  try {
    await access(path.join(ROOT, relPath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// リポジトリ検索メソッドの存在テスト
// ---------------------------------------------------------------------------

describe("リポジトリ検索メソッドの存在", () => {
  it("dealRepository.ts に searchByTitle 関数が存在する", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    expect(content).toContain("searchByTitle");
    expect(content).toContain("export async function searchByTitle(");
  });

  it("inquiryRepository.ts に searchByTitle 関数が存在する", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    expect(content).toContain("searchByTitle");
    expect(content).toContain("export async function searchByTitle(");
  });

  it("interactionRepository.ts に searchBySummary 関数が存在する", async () => {
    const content = await readSrc("infrastructure/repositories/interactionRepository.ts");
    expect(content).toContain("searchBySummary");
    expect(content).toContain("export async function searchBySummary(");
  });
});

// ---------------------------------------------------------------------------
// テナント分離テスト
// ---------------------------------------------------------------------------

describe("検索メソッドのテナント分離", () => {
  it("dealRepository.ts の searchByTitle 内に organizationId の条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function searchByTitle(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("inquiryRepository.ts の searchByTitle 内に organizationId の条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function searchByTitle(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("interactionRepository.ts の searchBySummary 内に organizationId の条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/interactionRepository.ts");
    const idx = content.indexOf("export async function searchBySummary(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });
});

// ---------------------------------------------------------------------------
// 検索上限テスト
// ---------------------------------------------------------------------------

describe("検索上限（LINK_SEARCH_LIMIT）", () => {
  it("dealRepository.ts の searchByTitle に .limit( が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function searchByTitle(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain(".limit(");
  });

  it("inquiryRepository.ts の searchByTitle に .limit( が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function searchByTitle(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain(".limit(");
  });

  it("interactionRepository.ts の searchBySummary に .limit( が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/interactionRepository.ts");
    const idx = content.indexOf("export async function searchBySummary(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain(".limit(");
  });
});

// ---------------------------------------------------------------------------
// 対象フィールドテスト
// ---------------------------------------------------------------------------

describe("検索対象フィールド", () => {
  it("dealRepository.ts の searchByTitle に deals.title への検索条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function searchByTitle(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("deals.title");
  });

  it("inquiryRepository.ts の searchByTitle に inquiries.title への検索条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function searchByTitle(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("inquiries.title");
  });

  it("interactionRepository.ts の searchBySummary に interactions.summary への検索条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/interactionRepository.ts");
    const idx = content.indexOf("export async function searchBySummary(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("interactions.summary");
    expect(body).toContain("isNotNull");
  });
});

// ---------------------------------------------------------------------------
// searchLinkTargetsAction テスト
// ---------------------------------------------------------------------------

describe("searchLinkTargetsAction", () => {
  it("actionItems.ts に searchLinkTargetsAction が存在する", async () => {
    const content = await readSrc("app/actions/actionItems.ts");
    expect(content).toContain("searchLinkTargetsAction");
    expect(content).toContain("export async function searchLinkTargetsAction(");
  });

  it("searchLinkTargetsAction 内に認証チェック（auth()）が含まれる", async () => {
    const content = await readSrc("app/actions/actionItems.ts");
    const idx = content.indexOf("export async function searchLinkTargetsAction(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("auth()");
  });
});

// ---------------------------------------------------------------------------
// 単一紐づけ（呼び出し元）テスト
// ---------------------------------------------------------------------------

describe("単一紐づけ — 呼び出し元での FK マッピング", () => {
  it("CreateTaskButton.tsx のコード内で linkTarget から dealId / interactionId をマッピングするコードが存在する", async () => {
    const content = await readSrc("app/(dashboard)/tasks/CreateTaskButton.tsx");
    expect(content).toContain("linkTarget");
    expect(content).toContain("dealId");
    expect(content).toContain("inquiryId");
    expect(content).toContain("interactionId");
  });

  it("ActionItemRow.tsx のコード内で linkTarget から dealId / interactionId をマッピングするコードが存在する", async () => {
    const content = await readSrc("app/(dashboard)/components/ActionItemRow.tsx");
    expect(content).toContain("linkTarget");
    expect(content).toContain("dealId");
    expect(content).toContain("inquiryId");
    expect(content).toContain("interactionId");
  });
});

// ---------------------------------------------------------------------------
// MeetingActionItemsSection 保護テスト
// ---------------------------------------------------------------------------

describe("MeetingActionItemsSection 保護 — createActionItem usecase 非改変", () => {
  it("createActionItem.ts に meetingId を優先して dealId を null にするロジックが存在しない", async () => {
    const content = await readSrc("application/usecases/createActionItem.ts");
    // 単一紐づけ強制ロジックが存在しないことを確認
    expect(content).not.toContain("dealId: null");
    expect(content).not.toContain("inquiryId: null");
    expect(content).not.toContain("meetingId: null");
  });

  it("createActionItem.ts に dealId / inquiryId / meetingId の優先ロジックが存在しない", async () => {
    const content = await readSrc("application/usecases/createActionItem.ts");
    // 優先ロジック（if meetingId then dealId=null など）が存在しない
    expect(content).not.toContain("meetingId ? null");
    expect(content).not.toContain("dealId ? null");
  });
});

// ---------------------------------------------------------------------------
// アーキテクチャ境界テスト
// ---------------------------------------------------------------------------

describe("アーキテクチャ境界 — searchMeetings.ts の import パス", () => {
  it("searchMeetings.ts が存在する", async () => {
    const exists = await fileExists("src/application/usecases/searchMeetings.ts");
    expect(exists).toBe(true);
  });

  it("searchMeetings.ts が src/app/(dashboard)/ 以下のファイルを import していない", async () => {
    const content = await readSrc("application/usecases/searchMeetings.ts");
    expect(content).not.toContain("src/app/(dashboard)/");
    expect(content).not.toContain("@/app/(dashboard)/");
  });

  it("searchMeetings.ts が src/lib/dateUtils を import している", async () => {
    const content = await readSrc("application/usecases/searchMeetings.ts");
    expect(content).toContain("@/lib/dateUtils");
  });

  it("searchMeetings.ts が src/lib/meetingLabels を import している", async () => {
    const content = await readSrc("application/usecases/searchMeetings.ts");
    expect(content).toContain("@/lib/meetingLabels");
  });
});

// ---------------------------------------------------------------------------
// デバウンス cleanup テスト
// ---------------------------------------------------------------------------

describe("デバウンス cleanup — LinkTargetPicker.tsx", () => {
  it("LinkTargetPicker.tsx が存在する", async () => {
    const exists = await fileExists(
      "src/app/(dashboard)/components/LinkTargetPicker.tsx"
    );
    expect(exists).toBe(true);
  });

  it("LinkTargetPicker.tsx 内に clearTimeout が存在する（アンマウント時のタイマーキャンセル）", async () => {
    const content = await readSrc("app/(dashboard)/components/LinkTargetPicker.tsx");
    expect(content).toContain("clearTimeout");
  });
});

// ---------------------------------------------------------------------------
// UI 旧プルダウン除去テスト
// ---------------------------------------------------------------------------

describe("UI 旧プルダウン除去", () => {
  it("TaskList.tsx に dealOptions が存在しない", async () => {
    const content = await readSrc("app/(dashboard)/tasks/TaskList.tsx");
    expect(content).not.toContain("dealOptions");
  });

  it("TaskList.tsx に inquiryOptions が存在しない", async () => {
    const content = await readSrc("app/(dashboard)/tasks/TaskList.tsx");
    expect(content).not.toContain("inquiryOptions");
  });

  it("tasks/page.tsx に listDeals が存在しない", async () => {
    const content = await readSrc("app/(dashboard)/tasks/page.tsx");
    expect(content).not.toContain("listDeals");
  });

  it("tasks/page.tsx に listInquiries が存在しない", async () => {
    const content = await readSrc("app/(dashboard)/tasks/page.tsx");
    expect(content).not.toContain("listInquiries");
  });
});
