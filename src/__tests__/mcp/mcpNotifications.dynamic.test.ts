/**
 * MCP notifications ツールの実行検証テスト。
 *
 * T-10: 通知一覧がトークンのユーザー本人の通知のみ返すことを固定する。
 *  - list operation: getNotifications が authInfo の userId で呼ばれる
 *  - list operation: getNotifications が authInfo の organizationId で呼ばれる
 *  - mark_as_read operation: markNotificationsAsRead が成功結果を返す
 *
 * 受け入れ基準:「通知一覧がトークンのユーザー本人の通知のみ返すことをテストで固定する」を満たす。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const state = {
  getNotificationsCalls: [] as unknown[],
  findByIdCalls: [] as unknown[],
  markAsReadCalls: [] as unknown[],
};

// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
import * as getNotificationsModule from "@/application/usecases/getNotifications";
import * as markNotificationsAsReadModule from "@/application/usecases/markNotificationsAsRead";
import * as userRepositoryModule from "@/infrastructure/repositories/userRepository";
const realGetNotifications = getNotificationsModule.getNotifications;
const realMarkNotificationsAsRead = markNotificationsAsReadModule.markNotificationsAsRead;
const realUserRepository = { ...userRepositoryModule };

mock.module("@/application/usecases/getNotifications", () => ({
  getNotifications: async (input: unknown) => {
    state.getNotificationsCalls.push(input);
    return { notifications: [], unreadCount: 0 };
  },
}));

mock.module("@/application/usecases/markNotificationsAsRead", () => ({
  markNotificationsAsRead: async (input: unknown) => {
    state.markAsReadCalls.push(input);
    return { ok: true as const };
  },
}));

// userRepository は notifications.ts から個別 import されるためここでモックする
mock.module("@/infrastructure/repositories/userRepository", () => ({
  ...realUserRepository,
  findById: async (userId: string, _organizationId: string) => {
    state.findByIdCalls.push({ userId, organizationId: _organizationId });
    return {
      id: userId,
      email: "test@example.com",
      name: "Test User",
      organizationId: _organizationId,
      role: "member",
      notificationsLastSeenAt: new Date("2026-01-01"),
      createdAt: new Date("2026-01-01"),
      deactivatedAt: null,
    };
  },
}));

afterAll(() => {
  mock.module("@/application/usecases/getNotifications", () => ({
    getNotifications: realGetNotifications,
  }));
  mock.module("@/application/usecases/markNotificationsAsRead", () => ({
    markNotificationsAsRead: realMarkNotificationsAsRead,
  }));
  mock.module("@/infrastructure/repositories/userRepository", () => realUserRepository);
});

// モック設定後に import する
const { registerNotificationsTools } = await import("../../app/api/mcp/tools/notifications");

async function callNotifications(
  args: Record<string, unknown>,
  userId = "user-A",
  organizationId = "org-1"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerNotificationsTools(server);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const authInfo: AuthInfo = {
    token: "cfp_test",
    clientId: userId,
    scopes: [],
    extra: { userId, organizationId, role: "member" },
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
      params: { name: "notifications", arguments: args },
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
  state.getNotificationsCalls = [];
  state.findByIdCalls = [];
  state.markAsReadCalls = [];
});

describe("MCP notifications ツール — ユーザー本人通知の分離（T-10）", () => {
  it("list は authInfo の userId でユーザーを取得し getNotifications を呼ぶ", async () => {
    const result = await callNotifications(
      { operation: "list" },
      "user-A",
      "org-1"
    );

    expect(result.isError).toBeUndefined();
    // userRepository.findById が呼ばれた
    expect(state.findByIdCalls).toHaveLength(1);
    const findArgs = state.findByIdCalls[0] as Record<string, unknown>;
    expect(findArgs.userId).toBe("user-A");
    // getNotifications が userId = "user-A" で呼ばれた
    expect(state.getNotificationsCalls).toHaveLength(1);
    const notifArgs = state.getNotificationsCalls[0] as Record<string, unknown>;
    expect(notifArgs.userId).toBe("user-A");
  });

  it("list は authInfo の organizationId を getNotifications に渡す（他テナント混入防止）", async () => {
    await callNotifications({ operation: "list" }, "user-A", "org-1");

    const notifArgs = state.getNotificationsCalls[0] as Record<string, unknown>;
    expect(notifArgs.organizationId).toBe("org-1");
  });

  it("list は userRepository.findById から取得した notificationsLastSeenAt を getNotifications に渡す（TC-018）", async () => {
    await callNotifications({ operation: "list" }, "user-A", "org-1");

    const notifArgs = state.getNotificationsCalls[0] as Record<string, unknown>;
    // findById の返値として notificationsLastSeenAt: new Date("2026-01-01") を設定した
    expect(notifArgs.notificationsLastSeenAt).toBeInstanceOf(Date);
  });

  it("mark_as_read は markNotificationsAsRead usecase を呼び成功結果を返す（TC-017）", async () => {
    const result = await callNotifications(
      { operation: "mark_as_read" },
      "user-A",
      "org-1"
    );

    expect(result.isError).toBeUndefined();
    expect(state.markAsReadCalls).toHaveLength(1);
  });
});
