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

  it("T-03: create メソッドが sourceType パラメータを受け付ける", async () => {
    // 準備 - リポジトリファイルを読み込む
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // 実行・検証 - create 関数の定義内に sourceType が含まれる
    const createIdx = src.indexOf("export async function create(");
    expect(createIdx).toBeGreaterThan(-1);
    const createBody = src.slice(createIdx, createIdx + 600);
    expect(createBody).toContain("sourceType?:");
  });

  it("T-03: status 未指定時のデフォルトが draft である", async () => {
    // 準備 - リポジトリファイルを読み込む
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // 実行・検証 - status: data.status ?? "draft" が存在する
    expect(src).toContain('data.status ?? "draft"');
  });
});

// ---------------------------------------------------------------------------
// Request ドメインモデルの検証
// ---------------------------------------------------------------------------

describe("Request domain model fields", () => {
  it("T-02: Request 型に sourceType フィールドが存在する", async () => {
    // 準備 - ドメインモデルファイルを読み込む
    const src = await readSrc("domain/models/request.ts");
    // 実行・検証 - sourceType フィールドが定義されている
    expect(src).toContain("sourceType: string | null");
  });

  it("T-02: Request 型に sourceId フィールドが存在する", async () => {
    // 準備 - ドメインモデルファイルを読み込む
    const src = await readSrc("domain/models/request.ts");
    // 実行・検証 - sourceId フィールドが定義されている
    expect(src).toContain("sourceId: string | null");
  });
});

// ---------------------------------------------------------------------------
// schema.ts の検証
// ---------------------------------------------------------------------------

describe("schema.ts requests table columns", () => {
  it("T-01: requests テーブルに source_type カラムが定義されている", async () => {
    // 準備 - スキーマファイルを読み込む
    const src = await readSrc("infrastructure/schema.ts");
    // 実行・検証 - source_type カラムが存在する
    expect(src).toContain('text("source_type")');
  });

  it("T-01: requests テーブルに source_id カラムが定義されている", async () => {
    // 準備 - スキーマファイルを読み込む
    const src = await readSrc("infrastructure/schema.ts");
    // 実行・検証 - source_id カラムが存在する
    expect(src).toContain('uuid("source_id")');
  });
});

// ---------------------------------------------------------------------------
// updateInquiryStatus の converted 遷移検証
// ---------------------------------------------------------------------------

describe("updateInquiryStatus converted 遷移", () => {
  it("T-04: converted 遷移で status: pending が渡される", async () => {
    // 準備 - ユースケースファイルを読み込む
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - status: "pending" が requestRepository.create の呼び出しに含まれる
    expect(src).toContain('status: "pending"');
  });

  it("T-04: converted 遷移で sourceType: inquiry が渡される", async () => {
    // 準備 - ユースケースファイルを読み込む
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - sourceType: "inquiry" が存在する
    expect(src).toContain('sourceType: "inquiry"');
  });

  it("T-04: converted 遷移で sourceId に引き合い ID が渡される", async () => {
    // 準備 - ユースケースファイルを読み込む
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    // 実行・検証 - sourceId: data.inquiryId が存在する
    expect(src).toContain("sourceId: data.inquiryId");
  });
});

// ---------------------------------------------------------------------------
// updateDealPhase の estimate_approval 遷移検証
// ---------------------------------------------------------------------------

describe("updateDealPhase estimate_approval 遷移", () => {
  it("T-05: estimate_approval 遷移で status: pending が渡される", async () => {
    // 準備 - ユースケースファイルを読み込む
    const src = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - status: "pending" が requestRepository.create の呼び出しに含まれる
    expect(src).toContain('status: "pending"');
  });

  it("T-05: estimate_approval 遷移で sourceType: deal が渡される", async () => {
    // 準備 - ユースケースファイルを読み込む
    const src = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - sourceType: "deal" が存在する
    expect(src).toContain('sourceType: "deal"');
  });

  it("T-05: estimate_approval 遷移で sourceId に案件 ID が渡される", async () => {
    // 準備 - ユースケースファイルを読み込む
    const src = await readSrc("application/usecases/updateDealPhase.ts");
    // 実行・検証 - sourceId: data.dealId が存在する
    expect(src).toContain("sourceId: data.dealId");
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
// approveRequest の連動処理検証
// ---------------------------------------------------------------------------

describe("approveRequest 連動処理", () => {
  it("T-06: approveRequest が inquiryRepository を import している", async () => {
    // 準備 - approveRequest ユースケースを読み込む
    const src = await readSrc("application/usecases/approveRequest.ts");
    // 実行・検証 - inquiryRepository が import されている
    expect(src).toContain("inquiryRepository");
  });

  it("T-06: approveRequest が dealRepository を import している", async () => {
    // 準備 - approveRequest ユースケースを読み込む
    const src = await readSrc("application/usecases/approveRequest.ts");
    // 実行・検証 - dealRepository が import されている
    expect(src).toContain("dealRepository");
  });

  it("T-06: approveRequest に sourceType === inquiry の分岐が存在する", async () => {
    // 準備 - approveRequest ユースケースを読み込む
    const src = await readSrc("application/usecases/approveRequest.ts");
    // 実行・検証 - "inquiry" 判定の分岐が存在する
    expect(src).toContain('"inquiry"');
    // inquiryRepository.findById を呼び出している
    expect(src).toContain("inquiryRepository.findById");
    // dealRepository.create を呼び出している（Deal 自動作成）
    expect(src).toContain("dealRepository.create");
  });

  it("T-06: approveRequest に sourceType === deal の分岐が存在する", async () => {
    // 準備 - approveRequest ユースケースを読み込む
    const src = await readSrc("application/usecases/approveRequest.ts");
    // 実行・検証 - "deal" 判定の分岐が存在する
    expect(src).toContain('"deal"');
    // dealRepository.updatePhase を呼び出している（フェーズ自動進行）
    expect(src).toContain("dealRepository.updatePhase");
    // won フェーズへの遷移が指定されている
    expect(src).toContain('"won"');
  });

  it("T-06: approveRequest に approval.linkage_failed の audit log 記録が存在する", async () => {
    // 準備 - approveRequest ユースケースを読み込む
    const src = await readSrc("application/usecases/approveRequest.ts");
    // 実行・検証 - 失敗時の audit log action が存在する
    expect(src).toContain("approval.linkage_failed");
  });

  it("T-06: 連動処理は try-catch で囲まれており失敗しても ok: true を返す", async () => {
    // 準備 - approveRequest ユースケースを読み込む
    const src = await readSrc("application/usecases/approveRequest.ts");
    // 実行・検証 - runPostApprovalLinkage が try-catch の外（or 内部で catch）で呼ばれている
    // linkage_failed の audit log が catch 節に存在することで失敗ハンドリングを確認
    expect(src).toContain("approval.linkage_failed");
    // ok: true の return が存在する
    expect(src).toContain("ok: true");
  });

  it("TC-011: no-steps フローでも runPostApprovalLinkage が呼ばれる", async () => {
    // 準備 - approveRequest ユースケースを読み込む
    const src = await readSrc("application/usecases/approveRequest.ts");
    // 実行・検証 - no-steps ブロック（steps.length === 0 判定以降、
    // Multi-step コメント手前）内に runPostApprovalLinkage の呼び出しが存在する
    const noStepsBlockIdx = src.indexOf("steps.length === 0");
    expect(noStepsBlockIdx).toBeGreaterThan(-1);
    const multiStepIdx = src.indexOf("// Multi-step approval flow");
    expect(multiStepIdx).toBeGreaterThan(noStepsBlockIdx);
    const noStepsBlock = src.slice(noStepsBlockIdx, multiStepIdx);
    expect(noStepsBlock).toContain("runPostApprovalLinkage");
  });
});

// ---------------------------------------------------------------------------
// requestRepository.mapRow の sourceType/sourceId マッピング検証（TC-005）
// ---------------------------------------------------------------------------

describe("requestRepository.mapRow sourceType/sourceId マッピング", () => {
  it("TC-005: mapRow が sourceType を row.sourceType からマッピングする", async () => {
    // 準備 - requestRepository.ts を読み込む
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // 実行・検証 - mapRow 関数内に sourceType: row.sourceType が存在する
    const mapRowIdx = src.indexOf("function mapRow(");
    expect(mapRowIdx).toBeGreaterThan(-1);
    const mapRowBody = src.slice(mapRowIdx, mapRowIdx + 500);
    expect(mapRowBody).toContain("sourceType: row.sourceType");
  });

  it("TC-005: mapRow が sourceId を row.sourceId からマッピングする", async () => {
    // 準備 - requestRepository.ts を読み込む
    const src = await readSrc("infrastructure/repositories/requestRepository.ts");
    // 実行・検証 - mapRow 関数内に sourceId: row.sourceId が存在する
    const mapRowIdx = src.indexOf("function mapRow(");
    expect(mapRowIdx).toBeGreaterThan(-1);
    const mapRowBody = src.slice(mapRowIdx, mapRowIdx + 500);
    expect(mapRowBody).toContain("sourceId: row.sourceId");
  });
});
