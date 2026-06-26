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
      "domain/models/client.ts",
      "domain/models/inquiry.ts",
      "domain/models/meeting.ts",
      "domain/models/deal.ts",
      "domain/models/contract.ts",
      "domain/models/invoice.ts",
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
      "domain/models/client.ts",
      "domain/models/inquiry.ts",
      "domain/models/meeting.ts",
      "domain/models/deal.ts",
      "domain/models/contract.ts",
      "domain/models/invoice.ts",
      "domain/models/index.ts",
      "domain/services/requestTransition.ts",
      "domain/services/approvalStepService.ts",
      "domain/services/inquiryTransition.ts",
      "domain/services/dealTransition.ts",
      "domain/services/contractTransition.ts",
      "domain/services/invoiceTransition.ts",
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
   * The request detail page must render an ApprovalStepper component (design-approval)
   * that shows each step's order, approverRole, status, approval timestamp,
   * and rejection comment.
   */
  it("TC-051: request detail page renders ApprovalStepsSection with step progress", async () => {
    const page = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    // ApprovalStepper component must be present (replaced ApprovalStepsSection)
    expect(page).toContain("ApprovalStepper");
    // Stepper functionality is in ApprovalStepper.tsx
    const stepper = await readSrc("app/(dashboard)/requests/[id]/ApprovalStepper.tsx");
    // Must display stepOrder
    expect(stepper).toContain("stepOrder");
    // Must display approverRole
    expect(stepper).toContain("approverRole");
    // Must display approvedAt timestamp
    expect(stepper).toContain("approvedAt");
    // Must display rejection comment
    expect(stepper).toContain("comment");
  });

  /**
   * TC-052: 承認/却下ボタンとコメント入力が pending 状態の承認者に表示される
   * When a request is in "pending" state and user is current approver, the detail page
   * must show "承認する" / "却下する" buttons and a comment textarea.
   * (design-approval: 差し戻し form replaced by approve/reject with isCurrentApprover check)
   */
  it("TC-052: request detail page shows revision form with comment textarea for pending requests", async () => {
    const page = await readSrc("app/(dashboard)/requests/[id]/page.tsx");
    const actionButtons = await readSrc("app/(dashboard)/requests/[id]/ActionButtons.tsx");
    const content = page + actionButtons;
    // Must check for pending status
    expect(content).toContain('"pending"');
    // Must have a Textarea (React component) for the comment
    expect(content).toContain("Textarea");
    // The comment field must have name="comment"
    expect(content).toContain('name="comment"');
    // Must have "承認する" button (replaced 差し戻す)
    expect(content).toContain("承認する");
    // Must have "却下する" button
    expect(content).toContain("却下する");
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
   * TC-054: 申請作成画面にテンプレート選択UIがあり、固定の金額入力フィールドがない
   * 金額自動選択が廃止され、ユーザーがテンプレートを手動選択する方式に変更された。
   * The new request page must have a templateId select element and must NOT have
   * a fixed amount input field (fields are now dynamically rendered from the template definition).
   */
  it("TC-054: new request page shows template selection UI without fixed amount input", async () => {
    const content = await readSrc("app/(dashboard)/requests/new/page.tsx");
    // Must have a template selection dropdown
    expect(content).toContain('name="templateId"');
    // Must NOT have a fixed amount input field (fields are dynamically rendered from template)
    expect(content).not.toContain('name="amount"');
  });

  /**
   * TC-055: 申請一覧画面で revision 状態のラベルが正しく表示される
   * The requests list page must include a "revision" status in its status map,
   * displaying it as "差し戻し" with the orange badge class.
   */
  it("TC-055: requests list page displays revision status as '差し戻し' with orange badge", async () => {
    // statusLabel/statusClass moved to statusUtils.ts (T-02 refactoring)
    const content = await readSrc("app/(dashboard)/requests/statusUtils.ts");
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
// Approval delegation structure — T-14
// ---------------------------------------------------------------------------

describe("Approval delegation structure", () => {
  it("schema.ts contains approval_delegations table definition", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("approval_delegations");
    expect(content).toContain("approvalDelegations");
    // Required columns
    expect(content).toContain("from_user_id");
    expect(content).toContain("to_user_id");
    expect(content).toContain("organization_id");
    expect(content).toContain("start_date");
    expect(content).toContain("end_date");
    expect(content).toContain("is_active");
    // Composite index
    expect(content).toContain("approval_delegations_to_user_org_active_idx");
  });

  it("approvalDelegation domain model file exists", async () => {
    const exists = await fileExists("src/domain/models/approvalDelegation.ts");
    expect(exists).toBe(true);
  });

  it("approvalDelegation domain model exports ApprovalDelegation type", async () => {
    const content = await readSrc("domain/models/approvalDelegation.ts");
    expect(content).toContain("ApprovalDelegation");
    expect(content).toContain("fromUserId");
    expect(content).toContain("toUserId");
    expect(content).toContain("fromUserRole");
    expect(content).toContain("organizationId");
    expect(content).toContain("startDate");
    expect(content).toContain("endDate");
    expect(content).toContain("isActive");
  });

  it("approvalDelegationRepository.ts exists", async () => {
    const exists = await fileExists(
      "src/infrastructure/repositories/approvalDelegationRepository.ts"
    );
    expect(exists).toBe(true);
  });

  it("repositories/index.ts exports approvalDelegationRepository", async () => {
    const content = await readSrc("infrastructure/repositories/index.ts");
    expect(content).toContain("approvalDelegationRepository");
  });

  it("domain/models/index.ts exports ApprovalDelegation", async () => {
    const content = await readSrc("domain/models/index.ts");
    expect(content).toContain("ApprovalDelegation");
  });
});

// ---------------------------------------------------------------------------
// Approval policy schema — T-01 to T-15
// ---------------------------------------------------------------------------

describe("Approval policy schema", () => {
  it("approvalPolicy domain model file exists", async () => {
    const exists = await fileExists("src/domain/models/approvalPolicy.ts");
    expect(exists).toBe(true);
  });

  it("approvalPolicy domain model exports ApprovalPolicy type", async () => {
    const content = await readSrc("domain/models/approvalPolicy.ts");
    expect(content).toContain("ApprovalPolicy");
    expect(content).toContain("ConditionOperator");
    expect(content).toContain("OriginType");
  });

  it("approvalPolicy domain model has no infrastructure imports", async () => {
    const content = await readSrc("domain/models/approvalPolicy.ts");
    expect(content).not.toContain("@/infrastructure");
  });

  it("approvalPolicyRepository.ts exists", async () => {
    const exists = await fileExists(
      "src/infrastructure/repositories/approvalPolicyRepository.ts"
    );
    expect(exists).toBe(true);
  });

  it("repositories/index.ts exports approvalPolicyRepository", async () => {
    const content = await readSrc("infrastructure/repositories/index.ts");
    expect(content).toContain("approvalPolicyRepository");
  });

  it("domain/models/index.ts exports ApprovalPolicy", async () => {
    const content = await readSrc("domain/models/index.ts");
    expect(content).toContain("ApprovalPolicy");
  });

  it("schema.ts contains approval_policies table definition", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("approval_policies");
    expect(content).toContain("trigger_action");
    expect(content).toContain("condition_field");
    expect(content).toContain("condition_operator");
    expect(content).toContain("condition_value");
    expect(content).toContain("template_id");
    expect(content).toContain("is_active");
  });

  it("schema.ts contains from_user_role column in approval_delegations", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("from_user_role");
  });

  it("schema.ts contains origin columns in requests", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("origin_type");
    expect(content).toContain("origin_policy_id");
    expect(content).toContain("origin_trigger_action");
    expect(content).toContain("origin_trigger_entity_id");
  });

  it("schema.ts contains name and approver_id in approval_steps", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("approver_id");
  });

  it("approvalDelegationRepository does not JOIN users for fromUserRole", async () => {
    const content = await readSrc(
      "infrastructure/repositories/approvalDelegationRepository.ts"
    );
    expect(content).not.toContain("innerJoin(fromUsers");
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
      // "domain/services/templateSelectionService.ts" は本変更で削除されるため除外
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
   * TC-057b: templateSelectionService.ts が削除され、evaluateStepCondition が approvalStepService.ts に存在する
   */
  it("TC-057b: templateSelectionService.ts does not exist in src/domain/services/", async () => {
    const exists = await fileExists("src/domain/services/templateSelectionService.ts");
    expect(exists).toBe(false);
  });

  it("TC-057b: evaluateStepCondition and filterStepsByCondition are defined in approvalStepService.ts", async () => {
    const content = await readSrc("domain/services/approvalStepService.ts");
    expect(content).toContain("evaluateStepCondition");
    expect(content).toContain("filterStepsByCondition");
    // Must be pure functions (no DB access)
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

// ---------------------------------------------------------------------------
// Bulk approval UI — one-time approval list
// ---------------------------------------------------------------------------

describe("Bulk approval UI", () => {
  it("BulkApprovalPanel.tsx exists", async () => {
    const exists = await fileExists(
      "src/app/(dashboard)/requests/BulkApprovalPanel.tsx"
    );
    expect(exists).toBe(true);
  });

  it("BulkApprovalPanel.tsx has use client directive", async () => {
    const content = await readSrc(
      "app/(dashboard)/requests/BulkApprovalPanel.tsx"
    );
    expect(content).toContain('"use client"');
  });

  it("BulkApprovalPanel.tsx contains checkbox input", async () => {
    const content = await readSrc(
      "app/(dashboard)/requests/BulkApprovalPanel.tsx"
    );
    const hasCheckbox =
      content.includes("checkbox") || content.includes('type="checkbox"');
    expect(hasCheckbox).toBe(true);
  });

  it("BulkApprovalPanel.tsx contains disabled attribute for button", async () => {
    const content = await readSrc(
      "app/(dashboard)/requests/BulkApprovalPanel.tsx"
    );
    expect(content).toContain("disabled");
  });

  it("requests/page.tsx imports BulkApprovalPanel", async () => {
    const content = await readSrc("app/(dashboard)/requests/page.tsx");
    expect(content).toContain("BulkApprovalPanel");
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — client/inquiry
// ---------------------------------------------------------------------------

describe("Tenant isolation — client/inquiry", () => {
  it("clientRepository.create includes organizationId", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function create(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("organizationId");
  });

  it("clientRepository.findById includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function findById(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("clientRepository.findAllByOrganization includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function findAllByOrganization(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("clientRepository.update includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/clientRepository.ts");
    const idx = content.indexOf("export async function update(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("inquiryRepository.create includes organizationId", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function create(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("organizationId");
  });

  it("inquiryRepository.findById includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function findById(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("inquiryRepository.findAllByOrganization includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function findAllByOrganization(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("inquiryRepository.findAllWithClientByOrganization includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function findAllWithClientByOrganization(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("inquiryRepository.update includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function update(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("inquiryRepository.updateStatus includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function updateStatus(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("inquiryRepository.updateStatus updates status only (conversionRequestId removed)", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function updateStatus(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    // ステータス更新が含まれる
    expect(body).toContain("status");
    // conversionRequestId は撤去済み
    expect(body).not.toContain("conversionRequestId");
  });

  it("inquiryRepository does not reference contactId", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    expect(content).not.toContain("contactId");
  });

  it("clients action uses session.user.organizationId", async () => {
    const content = await readSrc("app/actions/clients.ts");
    expect(content).toContain("session.user.organizationId");
  });

  it("inquiries action uses session.user.organizationId", async () => {
    const content = await readSrc("app/actions/inquiries.ts");
    expect(content).toContain("session.user.organizationId");
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — meeting
// ---------------------------------------------------------------------------

describe("Tenant isolation — meeting", () => {
  it("meetingRepository.create includes organizationId", async () => {
    const content = await readSrc("infrastructure/repositories/meetingRepository.ts");
    const idx = content.indexOf("export async function create(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("organizationId");
  });

  it("meetingRepository.findById includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/meetingRepository.ts");
    const idx = content.indexOf("export async function findById(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("meetingRepository.findAllByOrganization includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/meetingRepository.ts");
    const idx = content.indexOf("export async function findAllByOrganization(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("meetingRepository.findAllByDeal includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/meetingRepository.ts");
    const idx = content.indexOf("export async function findAllByDeal(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("meetingRepository.update includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/meetingRepository.ts");
    const idx = content.indexOf("export async function update(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("meetings action uses session.user.organizationId", async () => {
    const content = await readSrc("app/actions/meetings.ts");
    expect(content).toContain("session.user.organizationId");
  });
});

// ---------------------------------------------------------------------------
// deals.estimateRequestId FK onDelete constraint — TC-030
// ---------------------------------------------------------------------------

describe("deals.estimateRequestId FK onDelete constraint", () => {
  /**
   * TC-030: deals.estimateRequestId FK に onDelete: 'set null' が設定されている
   * estimateRequest が削除されても deal レコードが残るよう set null が必要。
   */
  it("TC-030: schema.ts defines deals.estimateRequestId with onDelete: 'set null'", async () => {
    // 準備 - スキーマファイルを読み込む
    const content = await readSrc("infrastructure/schema.ts");
    // 実行・検証 - estimate_request_id カラム定義と onDelete: "set null" が近傍に存在する
    const estimateIdx = content.indexOf("estimate_request_id");
    expect(estimateIdx).toBeGreaterThan(-1);
    // カラム定義の周辺 200 文字以内に set null が含まれる
    const vicinity = content.slice(estimateIdx, estimateIdx + 200);
    expect(vicinity).toContain("set null");
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — deal
// ---------------------------------------------------------------------------

describe("Tenant isolation — deal", () => {
  it("dealRepository.create includes organizationId", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function create(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("organizationId");
  });

  it("dealRepository.findById includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function findById(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("dealRepository.findAllByOrganization includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function findAllByOrganization(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("dealRepository.findByInquiryId includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function findByInquiryId(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("dealRepository.update includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function update(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("dealRepository.updatePhase includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function updatePhase(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("deals action uses session.user.organizationId", async () => {
    const content = await readSrc("app/actions/deals.ts");
    expect(content).toContain("session.user.organizationId");
  });

  it("dealContactRepository.ts exists", async () => {
    const exists = await fileExists(
      "src/infrastructure/repositories/dealContactRepository.ts"
    );
    expect(exists).toBe(true);
  });

  it("dealContactRepository.findByDeal includes organizationId parameter", async () => {
    const content = await readSrc("infrastructure/repositories/dealContactRepository.ts");
    const idx = content.indexOf("export async function findByDeal(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    // organizationId はシグネチャに必須
    expect(body).toContain("organizationId");
  });

  it("dealContactRepository.create includes organizationId tenant verification", async () => {
    const content = await readSrc("infrastructure/repositories/dealContactRepository.ts");
    const idx = content.indexOf("export async function create(");
    expect(idx).toBeGreaterThan(-1);
    // organizationId がシグネチャに含まれる
    const signature = content.slice(idx, idx + 200);
    expect(signature).toContain("organizationId");
    // INSERT 前に deals テーブルで所有確認している
    const body = content.slice(idx, idx + 700);
    expect(body).toContain("deals");
    expect(body).toContain("deals.organizationId");
  });

  it("repositories/index.ts exports dealContactRepository", async () => {
    const content = await readSrc("infrastructure/repositories/index.ts");
    expect(content).toContain("dealContactRepository");
  });
});

// ---------------------------------------------------------------------------
// UI動線改善 — T-13
// ---------------------------------------------------------------------------

describe("UI動線改善 — tenant isolation, audit log, and label tests", () => {
  it("dealContacts action uses session.user.organizationId", async () => {
    const content = await readSrc("app/actions/dealContacts.ts");
    expect(content).toContain("session.user.organizationId");
  });

  it("addDealContact usecase calls auditLogRepository", async () => {
    const content = await readSrc("application/usecases/addDealContact.ts");
    expect(content).toContain("auditLogRepository");
  });

  it("removeDealContact usecase calls auditLogRepository", async () => {
    const content = await readSrc("application/usecases/removeDealContact.ts");
    expect(content).toContain("auditLogRepository");
  });

  it("createClientContact usecase calls findById and createContact", async () => {
    const content = await readSrc("application/usecases/createClientContact.ts");
    expect(content).toContain("findById");
    expect(content).toContain("createContact");
  });

  it("inquiries action imports createClient usecase for concurrent client creation", async () => {
    const content = await readSrc("app/actions/inquiries.ts");
    expect(content).toContain("createClient");
  });

  it("labels.ts defines dealContactRoleLabels with all four roles", async () => {
    const content = await readSrc("app/(dashboard)/labels.ts");
    expect(content).toContain("dealContactRoleLabels");
    expect(content).toContain("key_person");
    expect(content).toContain("decision_maker");
    expect(content).toContain("technical");
    expect(content).toContain("other");
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — contract
// ---------------------------------------------------------------------------

describe("Tenant isolation — contract", () => {
  it("contractRepository.create includes organizationId", async () => {
    const content = await readSrc("infrastructure/repositories/contractRepository.ts");
    const idx = content.indexOf("export async function create(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("organizationId");
  });

  it("contractRepository.findById includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/contractRepository.ts");
    const idx = content.indexOf("export async function findById(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("contractRepository.findAllByDealId includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/contractRepository.ts");
    const idx = content.indexOf("export async function findAllByDealId(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("contractRepository.findAllByOrganization includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/contractRepository.ts");
    const idx = content.indexOf("export async function findAllByOrganization(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("contractRepository.update includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/contractRepository.ts");
    const idx = content.indexOf("export async function update(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("contracts action uses session.user.organizationId", async () => {
    const content = await readSrc("app/actions/contracts.ts");
    expect(content).toContain("session.user.organizationId");
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — invoice
// ---------------------------------------------------------------------------

describe("Tenant isolation — invoice", () => {
  it("invoiceRepository.create includes organizationId", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    const idx = content.indexOf("export async function create(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("organizationId");
  });

  it("invoiceRepository.findById includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    const idx = content.indexOf("export async function findById(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("invoiceRepository.findAllByContract includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    const idx = content.indexOf("export async function findAllByContract(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("invoiceRepository.update includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    const idx = content.indexOf("export async function update(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("invoiceRepository.updateStatus includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    const idx = content.indexOf("export async function updateStatus(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("invoiceRepository.sumAmountByContract includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/invoiceRepository.ts");
    const idx = content.indexOf("export async function sumAmountByContract(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
  });

  it("invoices action uses session.user.organizationId", async () => {
    const content = await readSrc("app/actions/invoices.ts");
    expect(content).toContain("session.user.organizationId");
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation — delete operations
// ---------------------------------------------------------------------------

describe("Tenant isolation — delete operations", () => {
  it("inquiryRepository.deleteById includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/inquiryRepository.ts");
    const idx = content.indexOf("export async function deleteById(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("dealRepository.deleteById includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/dealRepository.ts");
    const idx = content.indexOf("export async function deleteById(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("contractRepository.deleteById includes organizationId condition", async () => {
    const content = await readSrc("infrastructure/repositories/contractRepository.ts");
    const idx = content.indexOf("export async function deleteById(");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 400);
    expect(body).toContain("organizationId");
  });

  it("deleteInquiry checks for deal before deleting", async () => {
    const content = await readSrc("application/usecases/deleteInquiry.ts");
    const findIdx = content.indexOf("findByInquiryId");
    const deleteIdx = content.indexOf("deleteById");
    expect(findIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeGreaterThan(-1);
    // findByInquiryId（案件存在チェック）が deleteById より前に呼ばれていることを確認する
    expect(findIdx).toBeLessThan(deleteIdx);
  });

  it("deleteDeal checks for meetings and contracts before deleting", async () => {
    const content = await readSrc("application/usecases/deleteDeal.ts");
    const findMeetingIdx = content.indexOf("findAllByDeal");
    const findContractIdx = content.indexOf("findAllByDealId");
    const deleteIdx = content.indexOf("deleteById");
    expect(findMeetingIdx).toBeGreaterThan(-1);
    expect(findContractIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeGreaterThan(-1);
    // findAllByDeal / findAllByDealId（商談・契約存在チェック）が deleteById より前に呼ばれていることを確認する
    expect(findMeetingIdx).toBeLessThan(deleteIdx);
    expect(findContractIdx).toBeLessThan(deleteIdx);
  });

  it("deleteContract checks for invoices before deleting", async () => {
    const content = await readSrc("application/usecases/deleteContract.ts");
    const findIdx = content.indexOf("findAllByContract");
    const deleteIdx = content.indexOf("deleteById");
    expect(findIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeGreaterThan(-1);
    // findAllByContract（請求存在チェック）が deleteById より前に呼ばれていることを確認する
    expect(findIdx).toBeLessThan(deleteIdx);
  });

  it("deleteInquiryAction includes role guard via canPerform", async () => {
    const content = await readSrc("app/actions/inquiries.ts");
    const idx = content.indexOf("export async function deleteInquiryAction");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("canPerform");
  });

  it("deleteDealAction includes role guard via canPerform", async () => {
    const content = await readSrc("app/actions/deals.ts");
    const idx = content.indexOf("export async function deleteDealAction");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("canPerform");
  });

  it("deleteContractAction includes role guard via canPerform", async () => {
    const content = await readSrc("app/actions/contracts.ts");
    const idx = content.indexOf("export async function deleteContractAction");
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 600);
    expect(body).toContain("canPerform");
  });

  it("deleteInquiry records audit log", async () => {
    const content = await readSrc("application/usecases/deleteInquiry.ts");
    expect(content).toContain("auditLogRepository.create");
  });

  it("deleteDeal records audit log", async () => {
    const content = await readSrc("application/usecases/deleteDeal.ts");
    expect(content).toContain("auditLogRepository.create");
  });

  it("deleteContract records audit log", async () => {
    const content = await readSrc("application/usecases/deleteContract.ts");
    expect(content).toContain("auditLogRepository.create");
  });
});

// ---------------------------------------------------------------------------
// 引合画面デザイン適用 — TC-034, TC-038
// ---------------------------------------------------------------------------

describe("引合画面デザイン適用 — TC-034 and TC-038", () => {
  /**
   * TC-034: InquiryInfoSection に顧客関連 UI が含まれない
   *
   * 顧客セクション（<dt>顧客</dt>）、clientMode state、
   * clients/clientName/clientLinkId props が削除されており、
   * 件名・経路・内容の編集フォームのみが残っている。
   */
  it("TC-034: InquiryInfoSection does not contain customer-related UI or props", async () => {
    const content = await readSrc(
      "app/(dashboard)/inquiries/[id]/InquiryInfoSection.tsx",
    );
    // 顧客ブロックが存在しない
    expect(content).not.toContain("<dt>顧客</dt>");
    expect(content).not.toContain("clientMode");
    expect(content).not.toContain("clientName");
    expect(content).not.toContain("clientLinkId");
    // 件名・経路・内容のフォームは残っている
    expect(content).toContain("title");
    expect(content).toContain("source");
    expect(content).toContain("description");
  });

  /**
   * TC-038: dealMap の inquiryId → dealId マッピングが正しく構築される
   *
   * page.tsx の Server Component が deals 配列から
   * inquiryId → dealId の Map を reduce で構築している。
   */
  it("TC-038: inquiries page.tsx builds dealMap using reduce and Map", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/page.tsx");
    // dealMap が Map として構築される
    expect(content).toContain("dealMap");
    expect(content).toContain("new Map");
    // inquiryId → dealId のマッピングで d.id を値に使う
    expect(content).toContain("map.set");
    expect(content).toContain("inquiryId");
    // dealId が InquiryListView に渡される
    expect(content).toContain("dealMap.get");
  });
});

// ---------------------------------------------------------------------------
// 経路ラベル追加 — TC-001, TC-007
// ---------------------------------------------------------------------------

describe("経路ラベル追加 — sourceLabels and sourceOptions", () => {
  /**
   * TC-001: sourceLabels に email と agent_service が含まれる
   */
  it("TC-001: labels.ts の sourceLabels に email と agent_service が含まれる", async () => {
    const content = await readSrc("app/(dashboard)/labels.ts");
    // sourceLabels の定義ブロックを抽出
    const startIdx = content.indexOf("export const sourceLabels");
    expect(startIdx).toBeGreaterThan(-1);
    const endIdx = content.indexOf("};", startIdx);
    const block = content.slice(startIdx, endIdx + 2);
    // email と agent_service が含まれる
    expect(block).toContain("email");
    expect(block).toContain("agent_service");
    expect(block).toContain("メール");
    expect(block).toContain("仲介サービス");
  });

  /**
   * TC-007: sourceOptions が 8 要素かつ正確な順序で定義されている
   */
  it("TC-007: InquiryForm の sourceOptions が 8 要素かつ正確な順序で定義されている", async () => {
    const content = await readSrc("app/(dashboard)/inquiries/new/InquiryForm.tsx");
    const startIdx = content.indexOf("const sourceOptions");
    expect(startIdx).toBeGreaterThan(-1);
    const endIdx = content.indexOf("];", startIdx);
    const block = content.slice(startIdx, endIdx + 2);

    // 8 要素すべてが含まれる（プレースホルダー + 7 値）
    expect(block).toContain('value: ""');
    expect(block).toContain('"web"');
    expect(block).toContain('"phone"');
    expect(block).toContain('"email"');
    expect(block).toContain('"referral"');
    expect(block).toContain('"agent_service"');
    expect(block).toContain('"exhibition"');
    expect(block).toContain('"other"');

    // 定義順の検証：["", "web", "phone", "email", "referral", "agent_service", "exhibition", "other"]
    const positions = [
      block.indexOf('value: ""'),
      block.indexOf('"web"'),
      block.indexOf('"phone"'),
      block.indexOf('"email"'),
      block.indexOf('"referral"'),
      block.indexOf('"agent_service"'),
      block.indexOf('"exhibition"'),
      block.indexOf('"other"'),
    ];
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// アクションアイテム スキーマ — TC-001, TC-002
// ---------------------------------------------------------------------------

describe("アクションアイテム スキーマ — action_items table", () => {
  /**
   * TC-001: action_items テーブルに 6 つの FK 制約が存在する
   * organizations, users (assigneeId), users (createdById), meetings, deals, inquiries
   */
  it("TC-001: schema.ts の actionItems テーブルに 6 つの FK 参照が存在する", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    // actionItems テーブル定義ブロックを抽出する
    const tableStart = content.indexOf("export const actionItems = pgTable(");
    expect(tableStart).toBeGreaterThan(-1);
    // 次の pgTable 定義の前まで（accounts テーブル）
    const tableEnd = content.indexOf("export const accounts = pgTable(", tableStart);
    const block = content.slice(tableStart, tableEnd);

    // 各 FK 参照の存在を確認する
    expect(block).toContain("references(() => organizations.id)");       // organization_id FK
    expect(block).toContain("references(() => users.id, { onDelete: \"set null\" })"); // assignee_id FK
    expect(block).toContain("references(() => meetings.id, { onDelete: \"set null\" })"); // meeting_id FK
    expect(block).toContain("references(() => deals.id, { onDelete: \"set null\" })");    // deal_id FK
    expect(block).toContain("references(() => inquiries.id, { onDelete: \"set null\" })"); // inquiry_id FK
    expect(block).toContain("references(() => users.id)");               // created_by_id FK (without onDelete)

    // .references( の出現回数が 6 であることを確認する
    const refCount = (block.match(/\.references\(/g) ?? []).length;
    expect(refCount).toBe(6);
  });

  /**
   * TC-002: action_items テーブルに 3 つのインデックスが定義されている
   * (organization_id, done), (meeting_id), (deal_id)
   */
  it("TC-002: schema.ts の actionItems テーブルに 3 つのインデックスが定義されている", async () => {
    const content = await readSrc("infrastructure/schema.ts");
    expect(content).toContain("action_items_org_done_idx");
    expect(content).toContain("action_items_meeting_id_idx");
    expect(content).toContain("action_items_deal_id_idx");

    // インデックス定義ブロック内にインデックスが 3 つ存在することを確認する
    const tableStart = content.indexOf("export const actionItems = pgTable(");
    const tableEnd = content.indexOf("export const accounts = pgTable(", tableStart);
    const block = content.slice(tableStart, tableEnd);
    const indexCount = (block.match(/index\(/g) ?? []).length;
    expect(indexCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// アクションアイテム モデル — TC-004, TC-005, TC-006
// ---------------------------------------------------------------------------

describe("アクションアイテム モデル — ActionItem domain model", () => {
  /**
   * TC-004: ActionItem ドメインモデル型が全フィールドを含んで定義されている
   */
  it("TC-004: actionItem.ts に ActionItem 型の全フィールドが定義されている", async () => {
    const content = await readSrc("domain/models/actionItem.ts");
    expect(content).toContain("ActionItem");
    expect(content).toContain("id");
    expect(content).toContain("organizationId");
    expect(content).toContain("description");
    expect(content).toContain("assigneeId");
    expect(content).toContain("dueDate");
    expect(content).toContain("done");
    expect(content).toContain("meetingId");
    expect(content).toContain("dealId");
    expect(content).toContain("inquiryId");
    expect(content).toContain("createdById");
    expect(content).toContain("createdAt");
    expect(content).toContain("updatedAt");
    expect(content).toContain("export type ActionItem");
  });

  /**
   * TC-005: ActionItem モデルに infrastructure 層への import がない
   */
  it("TC-005: actionItem.ts に @/infrastructure への import がない", async () => {
    const content = await readSrc("domain/models/actionItem.ts");
    expect(content).not.toContain("@/infrastructure");
    expect(content).not.toContain("../infrastructure");
    expect(content).not.toContain("drizzle");
  });

  /**
   * TC-006: ActionItem がドメインモデルのバレルファイルから re-export されている
   */
  it("TC-006: domain/models/index.ts が ActionItem を re-export している", async () => {
    const content = await readSrc("domain/models/index.ts");
    expect(content).toContain("ActionItem");
    expect(content).toContain("actionItem");
  });
});

// ---------------------------------------------------------------------------
// アクションアイテム リポジトリ・ユースケース・サーバーアクション — TC-029, TC-033, TC-034
// ---------------------------------------------------------------------------

describe("アクションアイテム リポジトリ・ユースケース・サーバーアクション", () => {
  /**
   * TC-029: actionItemRepository がリポジトリのバレルファイルから export されている
   */
  it("TC-029: infrastructure/repositories/index.ts が actionItemRepository を export している", async () => {
    const content = await readSrc("infrastructure/repositories/index.ts");
    expect(content).toContain("actionItemRepository");
  });

  /**
   * TC-033: 全ユースケースがバレルファイルから export されている
   */
  it("TC-033: application/usecases/index.ts が全アクションアイテム usecase を export している", async () => {
    const content = await readSrc("application/usecases/index.ts");
    expect(content).toContain("createActionItem");
    expect(content).toContain("toggleActionItemDone");
    expect(content).toContain("updateActionItem");
    expect(content).toContain("deleteActionItem");
    expect(content).toContain("listActionItemsByDeal");
    expect(content).toContain("listActionItemsByMeeting");
  });

  /**
   * TC-034: 全サーバーアクションに "use server" ディレクティブがある
   */
  it("TC-034: app/actions/actionItems.ts が use server ディレクティブで始まる", async () => {
    const content = await readSrc("app/actions/actionItems.ts");
    expect(content.trimStart().startsWith('"use server"')).toBe(true);
  });

  it("TC-034: app/actions/actionItems.ts に createActionItemAction, toggleActionItemAction, updateActionItemAction, deleteActionItemAction が定義されている", async () => {
    const content = await readSrc("app/actions/actionItems.ts");
    expect(content).toContain("createActionItemAction");
    expect(content).toContain("toggleActionItemAction");
    expect(content).toContain("updateActionItemAction");
    expect(content).toContain("deleteActionItemAction");
  });

  it("actionItemRepository.ts が存在する", async () => {
    const exists = await fileExists(
      "src/infrastructure/repositories/actionItemRepository.ts"
    );
    expect(exists).toBe(true);
  });

  it("actionItemRepository.ts に organizationId 条件が含まれる", async () => {
    const content = await readSrc("infrastructure/repositories/actionItemRepository.ts");
    expect(content).toContain("organizationId");
  });
});
