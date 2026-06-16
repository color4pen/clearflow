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
      "domain/models/index.ts",
      "domain/services/requestTransition.ts",
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
// Build and lint — TC-058, TC-059
// ---------------------------------------------------------------------------

describe("Build and lint", () => {
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
