/**
 * MCP webhooks ツールの認可・シークレット秘匿・テナント分離・retry テスト。
 *
 * behavioral test（実行検証）:
 * - mock.module で依存を差し替えてツールを実際に実行し、結果・拒否・repository 呼び出しを assert する。
 * - ソース文字列照合は使用しない。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { WebhookEndpoint } from "@/domain/models/webhookEndpoint";
import type { WebhookDelivery } from "@/domain/models/webhookDelivery";

// ---- 状態 ----
const state = {
  findByOrganizationCalls: [] as string[],
  createCalls: [] as unknown[],
  deleteByIdCalls: [] as unknown[],
  updateIsActiveCalls: [] as unknown[],
  findByEndpointIdCalls: [] as unknown[],
  deliveryFindByIdResult: null as WebhookDelivery | null,
  endpointFindByIdResult: null as WebhookEndpoint | null,
  resetForRetryCalls: [] as string[],
  deliverSingleAttemptCalls: [] as unknown[],
  findByOrganizationResult: [] as WebhookEndpoint[],
};

// ---- 定数 ----
const ORG_1 = "org-1";
const ORG_2 = "org-2";
const USER_ADMIN = "550e8400-e29b-41d4-a716-446655440011";
const USER_MEMBER = "550e8400-e29b-41d4-a716-446655440012";
const ENDPOINT_ID = "550e8400-e29b-41d4-a716-446655440021";
const DELIVERY_ID = "550e8400-e29b-41d4-a716-446655440031";

const mockEndpoint: WebhookEndpoint = {
  id: ENDPOINT_ID,
  organizationId: ORG_1,
  url: "https://example.com/webhook",
  secret: "whsec_supersecretvalue",
  isActive: true,
  events: ["request.created"],
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockDeliveryFailed: WebhookDelivery = {
  id: DELIVERY_ID,
  endpointId: ENDPOINT_ID,
  event: "request.created",
  payload: {
    event: "request.created",
    timestamp: "2026-01-01T00:00:00.000Z",
    organizationId: ORG_1,
    data: {
      requestId: "req-001",
      requestTitle: "テスト",
      actorId: USER_ADMIN,
      actorName: "Admin",
    },
  },
  status: "failed",
  statusCode: 500,
  attempts: 3,
  lastAttemptAt: new Date("2026-01-01"),
  nextRetryAt: null,
  createdAt: new Date("2026-01-01"),
};

const mockDeliveryDelivered: WebhookDelivery = {
  ...mockDeliveryFailed,
  status: "delivered",
};

// ---- 実装を捕捉してからモック ----
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as webhookEndpointRepositoryModule from "@/infrastructure/repositories/webhookEndpointRepository";
import * as webhookDeliveryRepositoryModule from "@/infrastructure/repositories/webhookDeliveryRepository";
import * as webhookDeliveryModule from "@/infrastructure/webhookDelivery";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realWebhookEndpointRepository = { ...webhookEndpointRepositoryModule };
const realWebhookDeliveryRepository = { ...webhookDeliveryRepositoryModule };
const realWebhookDelivery = { ...webhookDeliveryModule };

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
    webhookManage: { limit: 10, windowMs: 60_000 },
  },
}));

mock.module("@/infrastructure/repositories/webhookEndpointRepository", () => ({
  findByOrganization: async (organizationId: string) => {
    state.findByOrganizationCalls.push(organizationId);
    return state.findByOrganizationResult;
  },
  create: async (input: unknown) => {
    state.createCalls.push(input);
    const typedInput = input as { organizationId: string; url: string; secret: string; events: string[] };
    return {
      ...mockEndpoint,
      organizationId: typedInput.organizationId,
      url: typedInput.url,
      secret: typedInput.secret,
      events: typedInput.events,
    };
  },
  deleteById: async (id: string, organizationId: string) => {
    state.deleteByIdCalls.push({ id, organizationId });
  },
  updateIsActive: async (id: string, organizationId: string, isActive: boolean) => {
    state.updateIsActiveCalls.push({ id, organizationId, isActive });
    return { ...mockEndpoint, isActive };
  },
  findById: async (_id: string, _organizationId: string) => {
    return state.endpointFindByIdResult;
  },
  findActiveByOrganizationAndEvent: realWebhookEndpointRepository.findActiveByOrganizationAndEvent,
}));

mock.module("@/infrastructure/repositories/webhookDeliveryRepository", () => ({
  findByEndpointId: async (endpointId: string, organizationId: string, options: unknown) => {
    state.findByEndpointIdCalls.push({ endpointId, organizationId, options });
    return [];
  },
  findById: async (_id: string, _organizationId: string) => {
    return state.deliveryFindByIdResult;
  },
  resetForRetry: async (id: string) => {
    state.resetForRetryCalls.push(id);
  },
  create: realWebhookDeliveryRepository.create,
  updateStatus: realWebhookDeliveryRepository.updateStatus,
  findLatestByEndpointIds: realWebhookDeliveryRepository.findLatestByEndpointIds,
}));

mock.module("@/infrastructure/webhookDelivery", () => ({
  deliverSingleAttempt: async (...args: unknown[]) => {
    state.deliverSingleAttemptCalls.push(args);
  },
  deliverToEndpoint: realWebhookDelivery.deliverToEndpoint,
  deliverWebhookEvent: realWebhookDelivery.deliverWebhookEvent,
  computeSignature: realWebhookDelivery.computeSignature,
  MAX_ATTEMPTS: realWebhookDelivery.MAX_ATTEMPTS,
  BASE_DELAY_MS: realWebhookDelivery.BASE_DELAY_MS,
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/infrastructure/repositories/webhookEndpointRepository", () =>
    realWebhookEndpointRepository
  );
  mock.module("@/infrastructure/repositories/webhookDeliveryRepository", () =>
    realWebhookDeliveryRepository
  );
  mock.module("@/infrastructure/webhookDelivery", () => realWebhookDelivery);
});

// モック設定後に import する
const { registerWebhooksTools } = await import("../../app/api/mcp/tools/webhooks");

// ---- ヘルパー ----
async function callWebhooksTool(
  args: Record<string, unknown>,
  userId: string,
  organizationId: string,
  role: string
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerWebhooksTools(server);
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
      params: { name: "webhooks", arguments: args },
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
  state.findByOrganizationCalls = [];
  state.createCalls = [];
  state.deleteByIdCalls = [];
  state.updateIsActiveCalls = [];
  state.findByEndpointIdCalls = [];
  state.deliveryFindByIdResult = null;
  state.endpointFindByIdResult = null;
  state.resetForRetryCalls = [];
  state.deliverSingleAttemptCalls = [];
  state.findByOrganizationResult = [];
});

// ============================================================
// 認可テスト
// ============================================================
describe("webhooks ツール — 認可テスト", () => {
  it("member で list を呼ぶと isError: true で拒否される", async () => {
    const result = await callWebhooksTool(
      { operation: "list" },
      USER_MEMBER,
      ORG_1,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.findByOrganizationCalls).toHaveLength(0);
  });

  it("member で create を呼ぶと isError: true で拒否される", async () => {
    const result = await callWebhooksTool(
      {
        operation: "create",
        url: "https://example.com/webhook",
        events: ["request.created"],
      },
      USER_MEMBER,
      ORG_1,
      "member"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("権限");
    expect(state.createCalls).toHaveLength(0);
  });

  it("admin で list を呼ぶと成功する", async () => {
    state.findByOrganizationResult = [mockEndpoint];

    const result = await callWebhooksTool(
      { operation: "list" },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.findByOrganizationCalls).toHaveLength(1);
  });
});

// ============================================================
// シークレット秘匿テスト
// ============================================================
describe("webhooks ツール — シークレット秘匿テスト", () => {
  it("admin で list を呼ぶと各エンドポイントに secret フィールドが存在しない", async () => {
    state.findByOrganizationResult = [mockEndpoint];

    const result = await callWebhooksTool(
      { operation: "list" },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.text) as Array<Record<string, unknown>>;
    expect(data).toHaveLength(1);
    expect("secret" in data[0]).toBe(false);
    // その他フィールドは含まれる
    expect(data[0].id).toBe(ENDPOINT_ID);
    expect(data[0].url).toBe("https://example.com/webhook");
  });

  it("admin で create を呼ぶとレスポンスに secret フィールドが 'whsec_' で始まるフル値で含まれる", async () => {
    const result = await callWebhooksTool(
      {
        operation: "create",
        url: "https://example.com/webhook",
        events: ["request.created"],
      },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.text) as Record<string, unknown>;
    expect(typeof data.secret).toBe("string");
    expect((data.secret as string).startsWith("whsec_")).toBe(true);
    // フル値（truncated でないこと）: "whsec_" + 64 文字 hex = 70 文字
    expect((data.secret as string).length).toBe(70);
  });
});

// ============================================================
// テナント分離テスト
// ============================================================
describe("webhooks ツール — テナント分離テスト", () => {
  it("org-1 で list を呼ぶと repository に organizationId: org-1 が渡される", async () => {
    await callWebhooksTool({ operation: "list" }, USER_ADMIN, ORG_1, "admin");

    expect(state.findByOrganizationCalls).toHaveLength(1);
    expect(state.findByOrganizationCalls[0]).toBe(ORG_1);
  });

  it("org-2 で list を呼ぶと repository に organizationId: org-2 が渡される", async () => {
    await callWebhooksTool({ operation: "list" }, USER_ADMIN, ORG_2, "admin");

    expect(state.findByOrganizationCalls).toHaveLength(1);
    expect(state.findByOrganizationCalls[0]).toBe(ORG_2);
  });
});

// ============================================================
// retry_delivery テスト
// ============================================================
describe("webhooks ツール — retry_delivery テスト", () => {
  it("failed 状態の配信は retry が成功する", async () => {
    state.deliveryFindByIdResult = mockDeliveryFailed;
    state.endpointFindByIdResult = mockEndpoint;

    const result = await callWebhooksTool(
      { operation: "retry_delivery", deliveryId: DELIVERY_ID },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.resetForRetryCalls).toHaveLength(1);
    expect(state.resetForRetryCalls[0]).toBe(DELIVERY_ID);
    expect(state.deliverSingleAttemptCalls).toHaveLength(1);
  });

  it("delivered 状態の配信は retry が isError: true で拒否される", async () => {
    state.deliveryFindByIdResult = mockDeliveryDelivered;
    state.endpointFindByIdResult = mockEndpoint;

    const result = await callWebhooksTool(
      { operation: "retry_delivery", deliveryId: DELIVERY_ID },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("failed 状態の配信のみリトライできます");
    expect(state.resetForRetryCalls).toHaveLength(0);
    expect(state.deliverSingleAttemptCalls).toHaveLength(0);
  });

  it("配信が見つからない場合は isError: true を返す", async () => {
    state.deliveryFindByIdResult = null;

    const result = await callWebhooksTool(
      { operation: "retry_delivery", deliveryId: DELIVERY_ID },
      USER_ADMIN,
      ORG_1,
      "admin"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("配信レコードが見つかりません");
    expect(state.resetForRetryCalls).toHaveLength(0);
  });
});
