/**
 * platform Server Actions のアクセス制御テスト。
 * - auth() をモックして認証・認可チェックを検証する。
 * - isSuperAdmin は env 変数で制御する（@/domain/services/superAdmin はモックしない）。
 * - インフラ層をモックしてユースケースのロジックと分離する。
 *   （バレル・個別 usecase ファイルのどちらもモックしない → 動的テストとの干渉を防ぐ）
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import type { Organization } from "@/domain/models/organization";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const mockState = {
  sessionUserId: null as string | null,
  sessionUserEmail: null as string | null,
  emailExists: false,
  createdOrganization: null as Organization | null,
  findAllResult: [] as Organization[],
  throwCode: null as string | null,
};

// ---------------------------------------------------------------------------
// モジュールモック（インフラ層のみ — usecase ファイルはモックしない）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/auth", () => ({
  auth: async () => {
    if (!mockState.sessionUserId) return null;
    return {
      user: {
        id: mockState.sessionUserId,
        email: mockState.sessionUserEmail,
        organizationId: "org-existing",
        role: "admin",
      },
    };
  },
}));

mock.module("@/infrastructure/db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<void>) => {
      if (mockState.throwCode) {
        const err = new Error("DB error") as Error & { code: string };
        err.code = mockState.throwCode;
        throw err;
      }
      await fn({});
    },
  },
}));

mock.module("@/infrastructure/repositories/organizationRepository", () => ({
  create: async (data: { name: string }, _tx?: unknown) => {
    if (!mockState.createdOrganization) throw new Error("no org set");
    return mockState.createdOrganization;
  },
  findAll: async () => mockState.findAllResult,
  findById: async () => null,
  update: async () => null,
}));

mock.module("@/infrastructure/repositories/userRepository", () => ({
  existsByEmail: async (_email: string) => mockState.emailExists,
  create: async (_data: unknown, _tx?: unknown) => ({
    id: "user-act-001",
    email: "admin@org.com",
    name: "Admin",
    organizationId: mockState.createdOrganization?.id ?? "org-act-001",
    role: "admin" as const,
    notificationsLastSeenAt: null,
    createdAt: new Date(),
    deactivatedAt: null,
  }),
  findByOrganization: async () => [],
  findById: async () => null,
  findByEmailForAuth: async () => null,
  updateRole: async () => null,
  updateProfile: async () => null,
  updatePassword: async () => false,
  updateNotificationsLastSeenAt: async () => {},
  findByIdForAuth: async () => null,
  deactivate: async () => null,
  reactivate: async () => null,
}));

mock.module("@/infrastructure/repositories/auditLogRepository", () => ({
  create: async (_data: unknown, _tx?: unknown) => ({
    id: "audit-act-001",
    action: "organization.create" as const,
    targetType: "organization" as const,
    targetId: "org-act-001",
    actorId: "actor-001",
    organizationId: "org-act-001",
    metadata: null,
    createdAt: new Date(),
  }),
  findByOrganization: async () => [],
  findByTargets: async () => [],
}));

mock.module("bcryptjs", () => ({
  default: {
    hash: async (_password: string, _rounds: number) => "hashed_password",
    compare: async (_plain: string, _hashed: string) => true,
  },
}));

mock.module("next/cache", () => ({
  revalidatePath: (_path: string) => {},
}));

import {
  provisionOrganizationAction,
  listAllOrganizationsAction,
} from "@/app/actions/platform";

// ---------------------------------------------------------------------------
// 環境変数
// ---------------------------------------------------------------------------

const SUPER_ADMIN_EMAIL = "superadmin@platform.test";
const REGULAR_EMAIL = "regular@platform.test";

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("provisionOrganizationAction — アクセス制御", () => {
  const originalEnv = process.env.SUPER_ADMIN_EMAILS;

  beforeEach(() => {
    mockState.sessionUserId = null;
    mockState.sessionUserEmail = null;
    mockState.emailExists = false;
    mockState.createdOrganization = null;
    mockState.throwCode = null;
    process.env.SUPER_ADMIN_EMAILS = SUPER_ADMIN_EMAIL;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SUPER_ADMIN_EMAILS;
    } else {
      process.env.SUPER_ADMIN_EMAILS = originalEnv;
    }
  });

  it("未認証時にエラーが返る", async () => {
    mockState.sessionUserId = null;

    const result = await provisionOrganizationAction(null, new FormData());

    expect(result?.success).toBe(false);
    if (result?.success === false) {
      expect(result.message).toContain("認証");
    }
  });

  it("認証済みだが非スーパー管理者の場合にエラーが返る", async () => {
    mockState.sessionUserId = "user-001";
    mockState.sessionUserEmail = REGULAR_EMAIL;

    const result = await provisionOrganizationAction(null, new FormData());

    expect(result?.success).toBe(false);
    if (result?.success === false) {
      expect(result.message).toContain("権限");
    }
  });

  it("スーパー管理者でかつ正しい入力の場合に成功する", async () => {
    mockState.sessionUserId = "superadmin-001";
    mockState.sessionUserEmail = SUPER_ADMIN_EMAIL;
    mockState.createdOrganization = {
      id: "org-act-001",
      name: "New Org",
      createdAt: new Date(),
    };

    const formData = new FormData();
    formData.set("organizationName", "New Org");
    formData.set("adminEmail", "admin@neworg.com");
    formData.set("adminName", "Admin User");
    formData.set("adminPassword", "securepass123");

    const result = await provisionOrganizationAction(null, formData);

    expect(result?.success).toBe(true);
  });

  it("zod 検証失敗時にエラーメッセージが返る（organizationName が空）", async () => {
    mockState.sessionUserId = "superadmin-001";
    mockState.sessionUserEmail = SUPER_ADMIN_EMAIL;

    const formData = new FormData();
    formData.set("organizationName", "");
    formData.set("adminEmail", "admin@neworg.com");
    formData.set("adminName", "Admin User");
    formData.set("adminPassword", "securepass123");

    const result = await provisionOrganizationAction(null, formData);

    expect(result?.success).toBe(false);
    if (result?.success === false) {
      expect(result.message).toBeTruthy();
    }
  });

  it("zod 検証失敗時にエラーメッセージが返る（adminEmail が不正）", async () => {
    mockState.sessionUserId = "superadmin-001";
    mockState.sessionUserEmail = SUPER_ADMIN_EMAIL;

    const formData = new FormData();
    formData.set("organizationName", "New Org");
    formData.set("adminEmail", "not-an-email");
    formData.set("adminName", "Admin User");
    formData.set("adminPassword", "securepass123");

    const result = await provisionOrganizationAction(null, formData);

    expect(result?.success).toBe(false);
    if (result?.success === false) {
      expect(result.message).toBeTruthy();
    }
  });

  it("zod 検証失敗時にエラーメッセージが返る（adminPassword が8文字未満）", async () => {
    mockState.sessionUserId = "superadmin-001";
    mockState.sessionUserEmail = SUPER_ADMIN_EMAIL;

    const formData = new FormData();
    formData.set("organizationName", "New Org");
    formData.set("adminEmail", "admin@neworg.com");
    formData.set("adminName", "Admin User");
    formData.set("adminPassword", "short");

    const result = await provisionOrganizationAction(null, formData);

    expect(result?.success).toBe(false);
    if (result?.success === false) {
      expect(result.message).toBeTruthy();
    }
  });
});

describe("listAllOrganizationsAction — アクセス制御", () => {
  const originalEnv = process.env.SUPER_ADMIN_EMAILS;

  beforeEach(() => {
    mockState.sessionUserId = null;
    mockState.sessionUserEmail = null;
    mockState.findAllResult = [];
    process.env.SUPER_ADMIN_EMAILS = SUPER_ADMIN_EMAIL;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SUPER_ADMIN_EMAILS;
    } else {
      process.env.SUPER_ADMIN_EMAILS = originalEnv;
    }
  });

  it("未認証時にエラーが返る", async () => {
    mockState.sessionUserId = null;

    const result = await listAllOrganizationsAction();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("認証");
    }
  });

  it("認証済みだが非スーパー管理者の場合にエラーが返る", async () => {
    mockState.sessionUserId = "user-001";
    mockState.sessionUserEmail = REGULAR_EMAIL;

    const result = await listAllOrganizationsAction();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("権限");
    }
  });

  it("スーパー管理者の場合は組織一覧が返る", async () => {
    mockState.sessionUserId = "superadmin-001";
    mockState.sessionUserEmail = SUPER_ADMIN_EMAIL;
    mockState.findAllResult = [
      { id: "org-act-list-001", name: "組織 A", createdAt: new Date() },
    ];

    const result = await listAllOrganizationsAction();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].id).toBe("org-act-list-001");
    }
  });
});
