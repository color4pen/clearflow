/**
 * MCP users ツールの認可・自己ロックアウト保護・テナント分離・監査記録テスト。
 *
 * behavioral test（実行検証）:
 * - mock.module で依存を差し替えてツールを実際に実行し、結果・拒否・usecase 到達を assert する。
 * - ソース文字列照合は使用しない。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { User } from "@/domain/models/user";

// ---- 状態 ----
const state = {
  listOrganizationUsersCalls: [] as unknown[],
  createUserCalls: [] as unknown[],
  updateUserRoleCalls: [] as unknown[],
  deactivateUserCalls: [] as unknown[],
  reactivateUserCalls: [] as unknown[],
  listResult: [] as User[],
};

// ---- 定数 ----
const ORG_1 = "org-1";
const ORG_2 = "org-2";
const USER_A = "550e8400-e29b-41d4-a716-446655440001";
const USER_B = "550e8400-e29b-41d4-a716-446655440002";
const TARGET_USER = "550e8400-e29b-41d4-a716-446655440099";

const mockUser: User = {
  id: USER_B,
  email: "newuser@example.com",
  name: "New User",
  organizationId: ORG_1,
  role: "member",
  notificationsLastSeenAt: null,
  createdAt: new Date("2026-01-01"),
  deactivatedAt: null,
};


// ---- 実装を捕捉してからモック ----
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as listOrganizationUsersModule from "@/application/usecases/listOrganizationUsers";
import * as createUserModule from "@/application/usecases/createUser";
import * as updateUserRoleModule from "@/application/usecases/updateUserRole";
import * as deactivateUserModule from "@/application/usecases/deactivateUser";
import * as reactivateUserModule from "@/application/usecases/reactivateUser";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realListOrganizationUsers = listOrganizationUsersModule.listOrganizationUsers;
const realCreateUser = createUserModule.createUser;
const realUpdateUserRole = updateUserRoleModule.updateUserRole;
const realDeactivateUser = deactivateUserModule.deactivateUser;
const realReactivateUser = reactivateUserModule.reactivateUser;

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
    webhookManage: { limit: 10, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/listOrganizationUsers", () => ({
  listOrganizationUsers: async (input: unknown) => {
    state.listOrganizationUsersCalls.push(input);
    return state.listResult;
  },
}));

mock.module("@/application/usecases/createUser", () => ({
  createUser: async (input: unknown) => {
    state.createUserCalls.push(input);
    return { ok: true as const, user: mockUser };
  },
}));

mock.module("@/application/usecases/updateUserRole", () => ({
  updateUserRole: async (input: unknown) => {
    state.updateUserRoleCalls.push(input);
    return { ok: true as const };
  },
}));

mock.module("@/application/usecases/deactivateUser", () => ({
  deactivateUser: async (input: { actorId: string; targetUserId: string; organizationId: string }) => {
    state.deactivateUserCalls.push(input);
    // 自己ロックアウト防止: actorId === targetUserId のとき拒否する
    if (input.actorId === input.targetUserId) {
      return { ok: false as const, reason: "自分自身は無効化できません" };
    }
    return { ok: true as const };
  },
}));

mock.module("@/application/usecases/reactivateUser", () => ({
  reactivateUser: async (input: unknown) => {
    state.reactivateUserCalls.push(input);
    return { ok: true as const };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/listOrganizationUsers", () => ({
    listOrganizationUsers: realListOrganizationUsers,
  }));
  mock.module("@/application/usecases/createUser", () => ({
    createUser: realCreateUser,
  }));
  mock.module("@/application/usecases/updateUserRole", () => ({
    updateUserRole: realUpdateUserRole,
  }));
  mock.module("@/application/usecases/deactivateUser", () => ({
    deactivateUser: realDeactivateUser,
  }));
  mock.module("@/application/usecases/reactivateUser", () => ({
    reactivateUser: realReactivateUser,
  }));
});

// モック設定後に import する
const { registerUsersTools } = await import("../../app/api/mcp/tools/users");

// ---- ヘルパー ----
async function callUsersTool(
  args: Record<string, unknown>,
  userId: string,
  organizationId: string,
  role: string
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerUsersTools(server);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const authInfo: AuthInfo = {
    token: "cfp_test",
    clientId: userId,
    scopes: [],
    extra: { userId, organizationId, role },
  };
  const request = new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "users", arguments: args },
    }),
  });
  const response = await transport.handleRequest(request, { authInfo });
  const body = (await response.json()) as {
    result?: { isError?: boolean; content?: { text: string }[] };
  };
  await transport.close();
  return {
    isError: body.result?.isError,
    text: body.result?.content?.[0]?.text ?? "",
  };
}

beforeEach(() => {
  state.listOrganizationUsersCalls = [];
  state.createUserCalls = [];
  state.updateUserRoleCalls = [];
  state.deactivateUserCalls = [];
  state.reactivateUserCalls = [];
  state.listResult = [];
});

// ============================================================
// 認可テスト
// ============================================================
describe("users ツール — 認可テスト", () => {
  it("member で list を呼ぶと isError: true で拒否される（listUsers は admin/manager のみ）", async () => {
    const result = await callUsersTool(
      { operation: "list" },
      USER_A,
      ORG_1,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.listOrganizationUsersCalls).toHaveLength(0);
  });

  it("member で create を呼ぶと isError: true で拒否される", async () => {
    const result = await callUsersTool(
      {
        operation: "create",
        email: "new@example.com",
        name: "New User",
        role: "member",
        password: "password123",
      },
      USER_A,
      ORG_1,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.createUserCalls).toHaveLength(0);
  });

  it("member で update_role を呼ぶと isError: true で拒否される", async () => {
    const result = await callUsersTool(
      {
        operation: "update_role",
        userId: TARGET_USER,
        role: "manager",
      },
      USER_A,
      ORG_1,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.updateUserRoleCalls).toHaveLength(0);
  });

  it("member で deactivate を呼ぶと isError: true で拒否される", async () => {
    const result = await callUsersTool(
      { operation: "deactivate", userId: TARGET_USER },
      USER_A,
      ORG_1,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.deactivateUserCalls).toHaveLength(0);
  });

  it("member で reactivate を呼ぶと isError: true で拒否される", async () => {
    const result = await callUsersTool(
      { operation: "reactivate", userId: TARGET_USER },
      USER_A,
      ORG_1,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.reactivateUserCalls).toHaveLength(0);
  });

  it("admin で list を呼ぶと成功する", async () => {
    const result = await callUsersTool(
      { operation: "list" },
      USER_A,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.listOrganizationUsersCalls).toHaveLength(1);
  });

  it("admin で create を呼ぶと createUser usecase に到達する", async () => {
    const result = await callUsersTool(
      {
        operation: "create",
        email: "new@example.com",
        name: "New User",
        role: "member",
        password: "password123",
      },
      USER_A,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.createUserCalls).toHaveLength(1);
  });
});

// ============================================================
// 自己ロックアウト防止テスト
// ============================================================
describe("users ツール — 自己ロックアウト防止テスト", () => {
  it("admin が自分自身を deactivate しようとすると isError: true で拒否される", async () => {
    const result = await callUsersTool(
      { operation: "deactivate", userId: USER_A },
      USER_A, // actorId === targetUserId
      ORG_1,
      "admin"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("自分自身は無効化できません");
    expect(state.deactivateUserCalls).toHaveLength(1);
  });

  it("admin が他のユーザーを deactivate するのは成功する", async () => {
    const result = await callUsersTool(
      { operation: "deactivate", userId: TARGET_USER },
      USER_A, // actorId !== targetUserId
      ORG_1,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.deactivateUserCalls).toHaveLength(1);
  });
});

// ============================================================
// テナント分離テスト
// ============================================================
describe("users ツール — テナント分離テスト", () => {
  it("org-1 で list を呼ぶと usecase に organizationId: org-1 が渡される", async () => {
    await callUsersTool({ operation: "list" }, USER_A, ORG_1, "admin");

    expect(state.listOrganizationUsersCalls).toHaveLength(1);
    const callArgs = state.listOrganizationUsersCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe(ORG_1);
  });

  it("org-2 で list を呼ぶと usecase に organizationId: org-2 が渡される", async () => {
    await callUsersTool({ operation: "list" }, USER_A, ORG_2, "admin");

    expect(state.listOrganizationUsersCalls).toHaveLength(1);
    const callArgs = state.listOrganizationUsersCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe(ORG_2);
  });

  it("org-1 と org-2 の 2 回の呼び出しで organizationId が混在しない", async () => {
    await callUsersTool({ operation: "list" }, USER_A, ORG_1, "admin");
    await callUsersTool({ operation: "list" }, USER_A, ORG_2, "admin");

    expect(state.listOrganizationUsersCalls).toHaveLength(2);
    const call1 = state.listOrganizationUsersCalls[0] as Record<string, unknown>;
    const call2 = state.listOrganizationUsersCalls[1] as Record<string, unknown>;
    expect(call1.organizationId).toBe(ORG_1);
    expect(call2.organizationId).toBe(ORG_2);
  });
});

// ============================================================
// 監査記録テスト
// ============================================================
describe("users ツール — 監査記録テスト", () => {
  it("create を呼ぶと createUser usecase が organizationId と actorId を受け取る", async () => {
    await callUsersTool(
      {
        operation: "create",
        email: "audit@example.com",
        name: "Audit User",
        role: "member",
        password: "password123",
      },
      USER_A,
      ORG_1,
      "admin"
    );

    expect(state.createUserCalls).toHaveLength(1);
    const callArgs = state.createUserCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe(ORG_1);
    expect(callArgs.actorId).toBe(USER_A);
  });
});
