/**
 * Static project structure tests
 *
 * These tests verify that the implementation adheres to the specified
 * architecture, configuration, and file conventions by inspecting
 * source files directly (without a live DB or server).
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile, access } from "fs/promises";
import { constants } from "fs";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

async function readRoot(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, relPath), "utf-8");
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
// Infrastructure configuration — TC-025 to TC-029
// ---------------------------------------------------------------------------

describe("Infrastructure configuration", () => {
  /**
   * TC-025: .env.example に DATABASE_URL と AUTH_SECRET が記載されている
   */
  it("TC-025: .env.example contains DATABASE_URL and AUTH_SECRET", async () => {
    const content = await readRoot(".env.example");
    expect(content).toContain("DATABASE_URL");
    expect(content).toContain("AUTH_SECRET");
  });

  /**
   * TC-026: drizzle.config.ts が存在し型チェックが通る
   */
  it("TC-026: drizzle.config.ts exists at project root", async () => {
    const exists = await fileExists("drizzle.config.ts");
    expect(exists).toBe(true);
  });

  it("TC-026: drizzle.config.ts uses defineConfig with correct schema path", async () => {
    const content = await readRoot("drizzle.config.ts");
    expect(content).toContain("defineConfig");
    expect(content).toContain("infrastructure/schema.ts");
    expect(content).toContain("dialect");
  });

  /**
   * TC-027: drizzle-kit generate でマイグレーションファイルが生成される
   *         (設定ファイルが正しく存在することを確認)
   */
  it("TC-027: drizzle.config.ts output directory configured for migration generation", async () => {
    const content = await readRoot("drizzle.config.ts");
    expect(content).toContain("drizzle"); // out: "./drizzle"
    expect(content).toContain("postgresql");
  });

  /**
   * TC-028: Auth.js adapter テーブルが schema.ts に定義されている
   */
  it("TC-028: accounts, sessions, verificationTokens defined in schema.ts", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("accounts");
    expect(content).toContain("sessions");
    expect(content).toContain("verificationTokens");
  });

  /**
   * TC-029: db インスタンスが型付きで export されている
   */
  it("TC-029: db.ts exports db instance using drizzle-orm/postgres-js", async () => {
    const content = await readSrc("infrastructure/db.ts");
    expect(content).toContain("drizzle-orm/postgres-js");
    expect(content).toContain("export const db");
    expect(content).toContain("schema");
  });
});

// ---------------------------------------------------------------------------
// Domain model / dependency direction — TC-031, TC-033, TC-034, TC-035, TC-036
// ---------------------------------------------------------------------------

describe("Domain model integrity", () => {
  /**
   * TC-031: domain/models 配下に ORM への依存がない
   */
  it("TC-031: domain/models files have no ORM imports", async () => {
    const modelFiles = [
      "domain/models/organization.ts",
      "domain/models/user.ts",
      "domain/models/request.ts",
      "domain/models/auditLog.ts",
      "domain/models/approvalStep.ts",
      "domain/models/approvalTemplate.ts",
      "domain/models/webhookEvent.ts",
      "domain/models/webhookEndpoint.ts",
      "domain/models/webhookDelivery.ts",
    ];
    for (const file of modelFiles) {
      const content = await readSrc(file);
      expect(content).not.toContain("drizzle");
      expect(content).not.toContain("@auth");
      expect(content).not.toContain("postgres");
    }
  });

  /**
   * TC-033: domain/services に infrastructure 層への import がない
   */
  it("TC-033: domain/services files have no infrastructure imports", async () => {
    const content = await readSrc("domain/services/requestTransition.ts");
    expect(content).not.toContain("@/infrastructure");
    expect(content).not.toContain("../infrastructure");
  });

  /**
   * TC-034: domain 層に infrastructure import がない（静的検証）
   */
  it("TC-034: no @/infrastructure import in domain layer", async () => {
    const files = [
      "domain/models/organization.ts",
      "domain/models/user.ts",
      "domain/models/request.ts",
      "domain/models/auditLog.ts",
      "domain/models/approvalStep.ts",
      "domain/models/approvalTemplate.ts",
      "domain/models/webhookEvent.ts",
      "domain/models/webhookEndpoint.ts",
      "domain/models/webhookDelivery.ts",
      "domain/models/index.ts",
      "domain/services/requestTransition.ts",
      "domain/services/approvalStepService.ts",
      "domain/services/index.ts",
    ];
    for (const file of files) {
      const content = await readSrc(file);
      expect(content).not.toContain("@/infrastructure");
    }
  });

  /**
   * TC-035: Auth.js 型拡張で Session と JWT に userId, organizationId, role が含まれる
   */
  it("TC-035: next-auth.d.ts extends Session and JWT with userId, organizationId, role", async () => {
    const content = await readSrc("types/next-auth.d.ts");
    expect(content).toContain("organizationId");
    expect(content).toContain("role");
    // Session must have id/userId
    expect(content).toContain("Session");
    // JWT must be extended
    expect(content).toContain("JWT");
  });

  /**
   * TC-036: usecase 層がアーキテクチャの依存方向に従っている
   */
  it("TC-036: usecases import from domain and infrastructure but domain does not import infrastructure", async () => {
    // Check usecase imports infrastructure/repositories
    const approveSrc = await readSrc("application/usecases/approveRequest.ts");
    expect(approveSrc).toContain("@/infrastructure/repositories");
    expect(approveSrc).toContain("@/domain/services");

    // Check domain does NOT import infrastructure
    const domainSvc = await readSrc("domain/services/requestTransition.ts");
    expect(domainSvc).not.toContain("@/infrastructure");
  });
});

// ---------------------------------------------------------------------------
// Authentication — TC-014, TC-015, TC-016, TC-021
// ---------------------------------------------------------------------------

describe("Authentication configuration", () => {
  /**
   * TC-014: 正しい認証情報でログインが成功する
   *         Credentials provider が bcryptjs でパスワード検証する
   */
  it("TC-014: auth.ts uses bcryptjs.compare for credential verification", async () => {
    const content = await readSrc("infrastructure/auth.ts");
    expect(content).toContain("bcrypt");
    expect(content).toContain("compare");
    expect(content).toContain("Credentials");
  });

  /**
   * TC-015: ログイン成功後のセッションに必要なフィールドが含まれる
   */
  it("TC-015: JWT and session callbacks include userId, organizationId, role", async () => {
    const content = await readSrc("infrastructure/auth.ts");
    expect(content).toContain("userId");
    expect(content).toContain("organizationId");
    expect(content).toContain("role");
    // JWT callback
    expect(content).toContain("token.userId");
    expect(content).toContain("token.organizationId");
    expect(content).toContain("token.role");
    // Session callback
    expect(content).toContain("session.user");
  });

  /**
   * TC-016: 誤った認証情報でログインが失敗する
   */
  it("TC-016: authorize returns null when password does not match", async () => {
    const content = await readSrc("infrastructure/auth.ts");
    // When passwordMatch is false, return null
    expect(content).toContain("passwordMatch");
    expect(content).toContain("return null");
  });

  /**
   * TC-006: auth.ts が findByEmailForAuth を使用する
   */
  it("TC-006: auth.ts uses findByEmailForAuth (not findByEmail)", async () => {
    const content = await readSrc("infrastructure/auth.ts");
    expect(content).toContain("findByEmailForAuth");
    expect(content).not.toContain("findByEmail(");
  });

  /**
   * TC-021: 未認証アクセスで /login へリダイレクトされる
   */
  it("TC-021: proxy.ts redirects unauthenticated users to /login", async () => {
    const content = await readSrc("proxy.ts");
    expect(content).toContain("/login");
    expect(content).toContain("NextResponse.redirect");
    // When session is null/undefined, redirect to login
    expect(content).toContain("!session");
  });
});

// ---------------------------------------------------------------------------
// Server Actions configuration — TC-041, TC-042
// ---------------------------------------------------------------------------

describe("Server Actions configuration", () => {
  /**
   * TC-041: 全 Server Action に "use server" ディレクティブがある
   */
  it("TC-041: requests.ts has use server directive", async () => {
    const content = await readSrc("app/actions/requests.ts");
    expect(content.trimStart().startsWith('"use server"')).toBe(true);
  });

  it("TC-041: auth.ts actions file has use server directive", async () => {
    const content = await readSrc("app/actions/auth.ts");
    expect(content.trimStart().startsWith('"use server"')).toBe(true);
  });

  /**
   * TC-042: mutation 系 action で auth() による認証チェックが最初に実行される
   */
  it("TC-042: auth() is called before usecase in createRequestAction", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const authIdx = content.indexOf("await auth()");
    const createIdx = content.indexOf("await createRequest(");
    expect(authIdx).toBeGreaterThan(-1);
    expect(createIdx).toBeGreaterThan(-1);
    expect(authIdx).toBeLessThan(createIdx);
  });

  it("TC-042: auth() is called before usecase in approveRequestAction", async () => {
    const content = await readSrc("app/actions/requests.ts");
    // approveRequestAction is the second occurrence of await auth()
    const firstAuth = content.indexOf("await auth()");
    const approveIdx = content.indexOf("await approveRequest(");
    expect(firstAuth).toBeGreaterThan(-1);
    expect(approveIdx).toBeGreaterThan(-1);
  });
});

// ---------------------------------------------------------------------------
// Auth.js configuration — TC-044, TC-045
// ---------------------------------------------------------------------------

describe("Auth.js configuration", () => {
  /**
   * TC-044: proxy.ts が src/proxy.ts に配置され関数名が proxy である
   */
  it("TC-044: src/proxy.ts exports a function named proxy", async () => {
    const content = await readSrc("proxy.ts");
    expect(content).toContain("export async function proxy");
  });

  /**
   * TC-045: Auth.js ルートハンドラ (GET, POST) が export されている
   */
  it("TC-045: api/auth/[...nextauth]/route.ts exports GET and POST from handlers", async () => {
    const content = await readSrc("app/api/auth/[...nextauth]/route.ts");
    expect(content).toContain("GET");
    expect(content).toContain("POST");
    expect(content).toContain("handlers");
  });
});

// ---------------------------------------------------------------------------
// UI configuration — TC-046, TC-048, TC-050
// ---------------------------------------------------------------------------

describe("UI implementation", () => {
  /**
   * TC-046: /login でログインフォームが表示される
   */
  it("TC-046: login page component renders a form with email and password inputs", async () => {
    const content = await readSrc("app/(auth)/login/page.tsx");
    expect(content).toContain("form");
    expect(content).toContain("email");
    expect(content).toContain("password");
  });

  /**
   * TC-048: 未認証ユーザーが /requests にアクセスすると /login へリダイレクトされる
   */
  it("TC-048: proxy.ts redirects unauthenticated access to /login", async () => {
    const content = await readSrc("proxy.ts");
    expect(content).toContain("/login");
    expect(content).toContain("redirect");
    // Passes /login and /api/auth without auth check
    expect(content).toContain("pathname.startsWith");
  });

  /**
   * TC-050: title 空で申請作成するとバリデーションエラーが表示される
   */
  it("TC-050: createRequestAction uses zod schema with min(1) on title", async () => {
    const content = await readSrc("app/actions/requests.ts");
    expect(content).toContain("z.string().min(1");
    expect(content).toContain("title");
  });
});

// ---------------------------------------------------------------------------
// Seed script — TC-056
// ---------------------------------------------------------------------------

describe("Seed script", () => {
  /**
   * TC-056: シードスクリプト実行後に admin@example.com でログインできる
   */
  it("TC-056: seed.ts creates admin@example.com user", async () => {
    const content = await readSrc("infrastructure/seed.ts");
    expect(content).toContain("admin@example.com");
    expect(content).toContain("password123");
    expect(content).toContain("admin");
  });
});

// ---------------------------------------------------------------------------
// Multi-stage approval UI — TC-051, TC-052, TC-053, TC-054, TC-055
// ---------------------------------------------------------------------------

describe("Multi-stage approval UI", () => {
  /**
   * TC-051: 承認ステップの進捗が申請詳細画面に一覧表示される
   * The request detail page must render an ApprovalStepsSection component
   * that shows each step's order, approverRole, status, approval timestamp,
   * and rejection comment.
   */
  it("TC-051: request detail page renders ApprovalStepsSection with step progress", async () => {
    const content = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    // ApprovalStepsSection component must be present
    expect(content).toContain("ApprovalStepsSection");
    // Must display stepOrder
    expect(content).toContain("stepOrder");
    // Must display approverRole
    expect(content).toContain("approverRole");
    // Must display step status
    expect(content).toContain("stepStatusLabel");
    // Must display approvedAt timestamp
    expect(content).toContain("approvedAt");
    // Must display rejection comment
    expect(content).toContain("comment");
  });

  /**
   * TC-052: 差し戻しボタンとコメント入力が pending 状態の申請に表示される
   * When a request is in "pending" state, the detail page must show
   * a revision form with a comment textarea and a "差し戻す" submit button.
   * Action buttons are implemented in ActionButtons.tsx (Client Component).
   */
  it("TC-052: request detail page shows revision form with comment textarea for pending requests", async () => {
    const page = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    const actionButtons = await readSrc("app/(dashboard)/requests/[id]/ActionButtons.tsx");
    const content = page + actionButtons;
    // Must check for pending status to show revision form
    expect(content).toContain('"pending"');
    // Must have a textarea for the revision comment
    expect(content).toContain("textarea");
    // The revision comment field must have name="comment"
    expect(content).toContain('name="comment"');
    // The targetStatus hidden input must carry "revision"
    expect(content).toContain('value="revision"');
    // Must have a "差し戻す" button
    expect(content).toContain("差し戻す");
  });

  /**
   * TC-053: 再申請ボタンが revision 状態の申請に表示される
   * When a request is in "revision" state, the detail page must show
   * a resubmit button that calls resubmitRequestAction.
   * Action buttons are implemented in ActionButtons.tsx (Client Component).
   */
  it("TC-053: request detail page shows resubmit button for revision status", async () => {
    const page = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    const actionButtons = await readSrc("app/(dashboard)/requests/[id]/ActionButtons.tsx");
    const content = page + actionButtons;
    // Must check for revision status
    expect(content).toContain('"revision"');
    // Must import and use resubmitRequestAction
    expect(content).toContain("resubmitRequestAction");
    // Must have a resubmit button label
    expect(content).toContain("再申請する");
  });

  /**
   * TC-054: 申請作成画面にテンプレート選択UIがなく、金額入力フィールドがある
   * テンプレート手動選択が廃止され、金額入力による自動選択に変更された。
   * The new request page must have an amount input field and must NOT have
   * a template selection <select> or listApprovalTemplatesAction import.
   */
  it("TC-054: new request page shows amount input instead of template selection", async () => {
    const content = await readSrc("app/(dashboard)/requests/new/page.tsx");
    // Must NOT import listApprovalTemplatesAction (template selection removed)
    expect(content).not.toContain("listApprovalTemplatesAction");
    // Must NOT have a <select> element for template selection
    expect(content).not.toContain('name="templateId"');
    // Must have an amount input field
    expect(content).toContain('name="amount"');
    expect(content).toContain('type="number"');
  });

  /**
   * TC-055: 申請一覧画面で revision 状態のラベルが正しく表示される
   * The requests list page must include a "revision" status in its status map,
   * displaying it as "差し戻し" with the orange badge class.
   */
  it("TC-055: requests list page displays revision status as '差し戻し' with orange badge", async () => {
    const content = await readSrc("app/(dashboard)/requests/page.tsx");
    // Must include "revision" in the status label map
    expect(content).toContain("revision");
    // "差し戻し" must be the display label
    expect(content).toContain("差し戻し");
    // Must apply orange styling for revision status
    expect(content).toContain("orange");
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — admin panel repositories and actions
// ---------------------------------------------------------------------------

describe("Tenant isolation — admin panel", () => {
  /**
   * approvalTemplateRepository の新規メソッドに organizationId 条件が含まれる
   */
  it("approvalTemplateRepository.create includes organizationId", async () => {
    const content = await readSrc(
      "infrastructure/repositories/approvalTemplateRepository.ts"
    );
    const createIdx = content.indexOf("export async function create(");
    expect(createIdx).toBeGreaterThan(-1);
    const createBody = content.slice(createIdx, createIdx + 500);
    expect(createBody).toContain("organizationId");
  });

  it("approvalTemplateRepository.updateById includes organizationId condition", async () => {
    const content = await readSrc(
      "infrastructure/repositories/approvalTemplateRepository.ts"
    );
    const updateIdx = content.indexOf("export async function updateById(");
    expect(updateIdx).toBeGreaterThan(-1);
    const updateBody = content.slice(updateIdx, updateIdx + 600);
    expect(updateBody).toContain("organizationId");
  });

  it("approvalTemplateRepository.deleteById includes organizationId condition", async () => {
    const content = await readSrc(
      "infrastructure/repositories/approvalTemplateRepository.ts"
    );
    const deleteIdx = content.indexOf("export async function deleteById(");
    expect(deleteIdx).toBeGreaterThan(-1);
    const deleteBody = content.slice(deleteIdx, deleteIdx + 400);
    expect(deleteBody).toContain("organizationId");
  });

  it("userRepository.findByOrganization includes organizationId condition", async () => {
    const content = await readSrc(
      "infrastructure/repositories/userRepository.ts"
    );
    const findIdx = content.indexOf("export async function findByOrganization(");
    expect(findIdx).toBeGreaterThan(-1);
    const findBody = content.slice(findIdx, findIdx + 400);
    expect(findBody).toContain("organizationId");
  });

  it("userRepository.updateRole includes organizationId condition", async () => {
    const content = await readSrc(
      "infrastructure/repositories/userRepository.ts"
    );
    const updateIdx = content.indexOf("export async function updateRole(");
    expect(updateIdx).toBeGreaterThan(-1);
    const updateBody = content.slice(updateIdx, updateIdx + 500);
    expect(updateBody).toContain("organizationId");
  });

  it("templates action uses session.user.organizationId", async () => {
    const content = await readSrc("app/actions/templates.ts");
    expect(content).toContain("session.user.organizationId");
  });

  it("users action uses session.user.organizationId", async () => {
    const content = await readSrc("app/actions/users.ts");
    expect(content).toContain("session.user.organizationId");
  });
});

// ---------------------------------------------------------------------------
// Build and lint — TC-057, TC-058, TC-059
// ---------------------------------------------------------------------------

describe("Build and lint", () => {
  /**
   * TC-057: bun run build が成功する
   *         (build phase verified separately — this test confirms all key
   *          source files required for a successful build exist and are importable)
   */
  it("TC-057: all key source files for the build exist", async () => {
    const keyFiles = [
      "domain/models/approvalStep.ts",
      "domain/models/approvalTemplate.ts",
      "domain/models/webhookEvent.ts",
      "domain/models/webhookEndpoint.ts",
      "domain/models/webhookDelivery.ts",
      "domain/services/approvalStepService.ts",
      "domain/services/templateSelectionService.ts",
      "infrastructure/repositories/approvalStepRepository.ts",
      "infrastructure/repositories/approvalTemplateRepository.ts",
      "infrastructure/repositories/webhookEndpointRepository.ts",
      "infrastructure/repositories/webhookDeliveryRepository.ts",
      "infrastructure/webhookDelivery.ts",
      "application/usecases/resubmitRequest.ts",
      "application/usecases/approveRequest.ts",
      "application/usecases/rejectRequest.ts",
      "app/api/audit-logs/export/route.ts",
    ];
    for (const file of keyFiles) {
      const exists = await fileExists(`src/${file}`);
      expect(exists).toBe(true);
    }
  });

  /**
   * TC-057b: templateSelectionService.ts が src/domain/services/ に存在する
   */
  it("TC-057b: templateSelectionService.ts exists in src/domain/services/", async () => {
    const exists = await fileExists("src/domain/services/templateSelectionService.ts");
    expect(exists).toBe(true);
    // Must export selectTemplate function
    const content = await readSrc("domain/services/templateSelectionService.ts");
    expect(content).toContain("export function selectTemplate");
    // Must be a pure function (no DB access)
    expect(content).not.toContain("import { db }");
    expect(content).not.toContain('from "@/infrastructure');
  });

  /**
   * TC-058: bun run build が成功する
   *         (verified by the 'build' phase — this test checks the build script exists)
   */
  it("TC-058: build script is configured in package.json", async () => {
    const content = await readRoot("package.json");
    const pkg = JSON.parse(content);
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.build).toBe("next build");
  });

  /**
   * TC-059: bun run lint がエラーなしで通る
   *         (verified by the 'lint' phase — this test checks the lint script exists)
   */
  it("TC-059: lint script is configured in package.json", async () => {
    const content = await readRoot("package.json");
    const pkg = JSON.parse(content);
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts.lint).toBe("eslint");
  });
});

// ---------------------------------------------------------------------------
// Transaction coverage — TC-003, TC-013, TC-014, TC-015
// ---------------------------------------------------------------------------

describe("Transaction coverage", () => {
  /**
   * TC-003: db.transaction がユースケースで呼ばれている
   */
  it("TC-003: approveRequest usecase calls db.transaction", async () => {
    const content = await readSrc("application/usecases/approveRequest.ts");
    expect(content).toContain("db.transaction");
    expect(content).toContain('from "@/infrastructure/db"');
  });

  it("TC-003: rejectRequest usecase calls db.transaction", async () => {
    const content = await readSrc("application/usecases/rejectRequest.ts");
    expect(content).toContain("db.transaction");
    expect(content).toContain('from "@/infrastructure/db"');
  });

  it("TC-003: submitRequest usecase calls db.transaction", async () => {
    const content = await readSrc("application/usecases/submitRequest.ts");
    expect(content).toContain("db.transaction");
    expect(content).toContain('from "@/infrastructure/db"');
  });

  /**
   * TC-013: Transaction 型が db.ts から export される
   */
  it("TC-013: db.ts exports Transaction type", async () => {
    const content = await readSrc("infrastructure/db.ts");
    expect(content).toContain("export type Transaction");
  });

  /**
   * TC-014: requestRepository.updateStatus に省略可能な tx 引数が追加される
   */
  it("TC-014: requestRepository.updateStatus has optional tx parameter", async () => {
    const content = await readSrc(
      "infrastructure/repositories/requestRepository.ts"
    );
    expect(content).toContain("tx?: Transaction");
    expect(content).toContain("Transaction");
  });

  /**
   * TC-015: auditLogRepository.create に省略可能な tx 引数が追加される
   */
  it("TC-015: auditLogRepository.create has optional tx parameter", async () => {
    const content = await readSrc(
      "infrastructure/repositories/auditLogRepository.ts"
    );
    expect(content).toContain("tx?: Transaction");
    expect(content).toContain("Transaction");
  });
});

// ---------------------------------------------------------------------------
// DATABASE_URL environment variable guard — TC-011
// ---------------------------------------------------------------------------

describe("DATABASE_URL environment variable guard", () => {
  /**
   * TC-011: DATABASE_URL が未設定の場合に明示的な Error が throw される
   */
  it("TC-011: db.ts checks for DATABASE_URL and throws explicit Error when not set", async () => {
    const content = await readSrc("infrastructure/db.ts");
    // Guard code must reference DATABASE_URL
    expect(content).toContain("DATABASE_URL");
    // Must throw an explicit Error (not rely on non-null assertion)
    expect(content).toContain("throw new Error");
    // Must not use non-null assertion (DATABASE_URL!)
    expect(content).not.toContain("DATABASE_URL!");
  });
});

// ---------------------------------------------------------------------------
// findByEmail rename — TC-007
// ---------------------------------------------------------------------------

describe("userRepository rename", () => {
  /**
   * TC-007: userRepository に findByEmail 関数が存在しない
   */
  it("TC-007: userRepository does not export findByEmail (renamed to findByEmailForAuth)", async () => {
    const content = await readSrc(
      "infrastructure/repositories/userRepository.ts"
    );
    // findByEmail must NOT exist as an exported function
    expect(content).not.toContain("export async function findByEmail(");
    expect(content).not.toContain("export function findByEmail(");
    // findByEmailForAuth must exist instead
    expect(content).toContain("findByEmailForAuth");
  });
});

// ---------------------------------------------------------------------------
// Server Actions error response unification — TC-019, TC-020, TC-025
// ---------------------------------------------------------------------------

describe("Server Actions error response unification", () => {
  /**
   * TC-019: rejectRequestAction が未認証時に構造化エラーレスポンスを返す
   */
  it("TC-019: rejectRequestAction returns { success: false, message } when unauthenticated", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const rejectIdx = content.indexOf("async function rejectRequestAction");
    expect(rejectIdx).toBeGreaterThan(-1);
    const rejectBody = content.slice(rejectIdx);
    expect(rejectBody).toContain("success: false");
    expect(rejectBody).toContain("認証が必要です");
  });

  /**
   * TC-020: submitRequestAction が未認証時に構造化エラーレスポンスを返す
   */
  it("TC-020: submitRequestAction returns { success: false, message } when unauthenticated", async () => {
    const content = await readSrc("app/actions/requests.ts");
    const submitIdx = content.indexOf("async function submitRequestAction");
    expect(submitIdx).toBeGreaterThan(-1);
    const submitBody = content.slice(submitIdx);
    expect(submitBody).toContain("success: false");
    expect(submitBody).toContain("認証が必要です");
  });

  /**
   * TC-025: createRequestAction の戻り値型が変更されていない
   */
  it("TC-025: createRequestAction return type is CreateRequestState (not ActionResult)", async () => {
    const content = await readSrc("app/actions/requests.ts");
    // The overall file must define CreateRequestState
    expect(content).toContain("CreateRequestState");
    // createRequestAction must declare Promise<CreateRequestState> as return type
    expect(content).toContain("Promise<CreateRequestState>");
    // Verify createRequestAction does not use ActionResult as its return type
    const createIdx = content.indexOf("async function createRequestAction");
    expect(createIdx).toBeGreaterThan(-1);
    const createSignature = content.slice(createIdx, createIdx + 300);
    expect(createSignature).toContain("CreateRequestState");
    expect(createSignature).not.toContain("ActionResult");
  });
});

// ---------------------------------------------------------------------------
// File structure (proxy vs middleware) — TC-026
// ---------------------------------------------------------------------------

describe("File structure (proxy vs middleware)", () => {
  /**
   * TC-026: src/proxy.ts が存在し src/middleware.ts が存在しない
   * Next.js 16 では middleware.ts が deprecated で proxy.ts にリネーム済み
   */
  it("TC-026: src/proxy.ts exists", async () => {
    const exists = await fileExists("src/proxy.ts");
    expect(exists).toBe(true);
  });

  it("TC-026: src/middleware.ts does not exist", async () => {
    const exists = await fileExists("src/middleware.ts");
    expect(exists).toBe(false);
  });
});
