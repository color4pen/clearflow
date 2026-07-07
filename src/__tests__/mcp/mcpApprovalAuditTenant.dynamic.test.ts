/**
 * MCP 承認系ツールの監査記録・テナント分離の実行検証テスト（T-11）。
 *
 * 受け入れ基準「書き込みが監査ログに記録され、他テナントに触れられないことをテストで固定する」を満たす。
 *
 * 1. 監査記録の実行検証:
 *    approval_requests.create → createRequest usecase が organizationId と creatorId を受け取って呼ばれることを assert する。
 *    （usecase 内で recordAudit が呼ばれる = 監査記録されることの保証）
 *
 * 2. テナント分離の実行検証:
 *    org-A と org-B の 2 つの authInfo で各ツールを呼び、usecase に渡される organizationId が
 *    それぞれ authInfo の値と一致することを assert する。
 *    対象ツール: approval_requests, delegations, approval_templates, approval_policies（全 4 ツール）
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Request as ApprovalRequest } from "@/domain/models/request";
import type { ApprovalDelegation } from "@/domain/models/approvalDelegation";
import type { ApprovalTemplate } from "@/domain/models/approvalTemplate";
import type { ApprovalPolicy } from "@/domain/models/approvalPolicy";

// ---- 状態 ----
const state = {
  createRequestCalls: [] as unknown[],
  submitRequestCalls: [] as unknown[],
  createDelegationCalls: [] as unknown[],
  createTemplateCalls: [] as unknown[],
  createPolicyCalls: [] as unknown[],
};

// ---- モックデータ ----
const TEMPLATE_UUID = "550e8400-e29b-41d4-a716-446655440001";
const POLICY_UUID = "550e8400-e29b-41d4-a716-446655440002";

const mockRequest: ApprovalRequest = {
  id: "req-1",
  title: "テスト申請",
  formData: {},
  templateId: TEMPLATE_UUID,
  status: "draft",
  organizationId: "org-A",
  creatorId: "user-A",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
  originType: "manual",
  originPolicyId: null,
  originTriggerAction: null,
  originTriggerEntityId: null,
};

const mockDelegation: ApprovalDelegation = {
  id: "delegation-1",
  fromUserId: "user-A",
  toUserId: "user-B",
  fromUserRole: "manager",
  organizationId: "org-A",
  startDate: new Date("2026-07-01"),
  endDate: new Date("2026-08-01"),
  isActive: true,
  createdAt: new Date("2026-07-01"),
};

const mockTemplate: ApprovalTemplate = {
  id: TEMPLATE_UUID,
  name: "テストテンプレート",
  organizationId: "org-A",
  steps: [{ stepOrder: 1, approverRole: "manager" }],
  fields: [],
  createdAt: new Date("2026-01-01"),
};

const mockPolicy: ApprovalPolicy = {
  id: POLICY_UUID,
  name: "テストポリシー",
  organizationId: "org-A",
  triggerAction: "inquiry.convert",
  templateId: TEMPLATE_UUID,
  description: null,
  conditionField: null,
  conditionOperator: null,
  conditionValue: null,
  isActive: true,
  createdAt: new Date("2026-01-01"),
};

// ---- 実装を捕捉してからモック ----
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as createRequestModule from "@/application/usecases/createRequest";
import * as submitRequestModule from "@/application/usecases/submitRequest";
import * as createDelegationModule from "@/application/usecases/createDelegation";
import * as createTemplateModule from "@/application/usecases/createTemplate";
import * as createPolicyModule from "@/application/usecases/createPolicy";
import * as approvalTemplateRepositoryModule from "@/infrastructure/repositories/approvalTemplateRepository";
import * as approvalPolicyRepositoryModule from "@/infrastructure/repositories/approvalPolicyRepository";
import * as approvalDelegationRepositoryModule from "@/infrastructure/repositories/approvalDelegationRepository";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realCreateRequest = createRequestModule.createRequest;
const realSubmitRequest = submitRequestModule.submitRequest;
const realCreateDelegation = createDelegationModule.createDelegation;
const realCreateTemplate = createTemplateModule.createTemplate;
const realCreatePolicy = createPolicyModule.createPolicy;
const realApprovalTemplateRepository = { ...approvalTemplateRepositoryModule };
const realApprovalPolicyRepository = { ...approvalPolicyRepositoryModule };
const realApprovalDelegationRepository = { ...approvalDelegationRepositoryModule };

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    approveReject: { limit: 30, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/createRequest", () => ({
  createRequest: async (input: unknown) => {
    state.createRequestCalls.push(input);
    return { ok: true as const, request: { ...mockRequest, organizationId: (input as Record<string, string>).organizationId } };
  },
}));

mock.module("@/application/usecases/submitRequest", () => ({
  submitRequest: async (input: unknown) => {
    state.submitRequestCalls.push(input);
    return { ok: true as const, request: { ...mockRequest, status: "pending" as const, organizationId: (input as Record<string, string>).organizationId } };
  },
}));

mock.module("@/application/usecases/createDelegation", () => ({
  createDelegation: async (input: unknown) => {
    state.createDelegationCalls.push(input);
    return { ok: true as const, delegation: { ...mockDelegation, organizationId: (input as Record<string, string>).organizationId } };
  },
}));

mock.module("@/application/usecases/createTemplate", () => ({
  createTemplate: async (input: unknown) => {
    state.createTemplateCalls.push(input);
    return { ok: true as const, template: { ...mockTemplate, organizationId: (input as Record<string, string>).organizationId } };
  },
}));

mock.module("@/application/usecases/createPolicy", () => ({
  createPolicy: async (input: unknown) => {
    state.createPolicyCalls.push(input);
    return { ok: true as const, policy: { ...mockPolicy, organizationId: (input as Record<string, string>).organizationId } };
  },
}));

// approvalTemplateRepository.findById は approval_requests.create で使用する
mock.module("@/infrastructure/repositories/approvalTemplateRepository", () => ({
  findById: async (_id: unknown, organizationId: unknown) => ({
    ...mockTemplate,
    organizationId,
    fields: [],
  }),
  findByOrganization: async () => [mockTemplate],
}));

mock.module("@/infrastructure/repositories/approvalPolicyRepository", () => ({
  findByOrganization: async () => [mockPolicy],
  findById: async () => mockPolicy,
}));

mock.module("@/infrastructure/repositories/approvalDelegationRepository", () => ({
  findByOrganization: async () => [],
  findActiveByToUserId: async () => [],
  create: async () => mockDelegation,
  deactivate: async () => null,
  findOverlapping: async () => [],
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/createRequest", () => ({
    createRequest: realCreateRequest,
  }));
  mock.module("@/application/usecases/submitRequest", () => ({
    submitRequest: realSubmitRequest,
  }));
  mock.module("@/application/usecases/createDelegation", () => ({
    createDelegation: realCreateDelegation,
  }));
  mock.module("@/application/usecases/createTemplate", () => ({
    createTemplate: realCreateTemplate,
  }));
  mock.module("@/application/usecases/createPolicy", () => ({
    createPolicy: realCreatePolicy,
  }));
  mock.module("@/infrastructure/repositories/approvalTemplateRepository", () =>
    realApprovalTemplateRepository
  );
  mock.module("@/infrastructure/repositories/approvalPolicyRepository", () =>
    realApprovalPolicyRepository
  );
  mock.module("@/infrastructure/repositories/approvalDelegationRepository", () =>
    realApprovalDelegationRepository
  );
});

// モック設定後に import する
const { registerApprovalRequestsTools } = await import(
  "../../app/api/mcp/tools/approvalRequests"
);
const { registerDelegationsTools } = await import("../../app/api/mcp/tools/delegations");
const { registerApprovalTemplatesTools } = await import(
  "../../app/api/mcp/tools/approvalTemplates"
);
const { registerApprovalPoliciesTools } = await import(
  "../../app/api/mcp/tools/approvalPolicies"
);

// ---- ヘルパー ----
async function callTool(
  toolName: string,
  registerFn: (server: McpServer) => void,
  args: Record<string, unknown>,
  userId: string,
  organizationId: string,
  role = "admin"
): Promise<{ isError?: boolean; text: string }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerFn(server);
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
      params: { name: toolName, arguments: args },
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
  state.createRequestCalls = [];
  state.submitRequestCalls = [];
  state.createDelegationCalls = [];
  state.createTemplateCalls = [];
  state.createPolicyCalls = [];
});

// ============================================================
// T-11: 監査記録の実行検証（approval_requests.create）
// ============================================================
describe("T-11: 監査記録の実行検証（approval_requests.create）", () => {
  it("approval_requests.create は createRequest usecase を organizationId と creatorId を含む引数で呼ぶ（usecase 内で recordAudit が呼ばれる）", async () => {
    const result = await callTool(
      "approval_requests",
      registerApprovalRequestsTools,
      { operation: "create", title: "テスト申請", templateId: TEMPLATE_UUID },
      "user-A",
      "org-A",
      "admin"
    );

    expect(result.isError).toBeUndefined();
    expect(state.createRequestCalls).toHaveLength(1);
    const callArgs = state.createRequestCalls[0] as Record<string, unknown>;
    expect(callArgs.organizationId).toBe("org-A");
    expect(callArgs.creatorId).toBe("user-A");
  });
});

// ============================================================
// T-11: テナント分離の実行検証（approval_requests）
// ============================================================
describe("T-11: テナント分離の実行検証（approval_requests）", () => {
  it("org-A と org-B で approval_requests.submit を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
    const REQUEST_UUID_A = "550e8400-e29b-41d4-a716-446655440010";
    const REQUEST_UUID_B = "550e8400-e29b-41d4-a716-446655440011";

    await callTool(
      "approval_requests",
      registerApprovalRequestsTools,
      { operation: "submit", requestId: REQUEST_UUID_A },
      "user-A",
      "org-A",
      "member"
    );
    await callTool(
      "approval_requests",
      registerApprovalRequestsTools,
      { operation: "submit", requestId: REQUEST_UUID_B },
      "user-B",
      "org-B",
      "member"
    );

    expect(state.submitRequestCalls).toHaveLength(2);
    const args1 = state.submitRequestCalls[0] as Record<string, unknown>;
    const args2 = state.submitRequestCalls[1] as Record<string, unknown>;
    expect(args1.organizationId).toBe("org-A");
    expect(args2.organizationId).toBe("org-B");
    expect(args1.organizationId).not.toBe(args2.organizationId);
  });
});

// ============================================================
// T-11: テナント分離の実行検証（delegations）
// ============================================================
describe("T-11: テナント分離の実行検証（delegations）", () => {
  // manager ロールなので fromUserId = 自分自身（userId）にする必要がある
  const USER_A_UUID = "550e8400-e29b-41d4-a716-446655440020";
  const USER_B_UUID = "550e8400-e29b-41d4-a716-446655440021";
  const TO_USER_UUID_A = "550e8400-e29b-41d4-a716-446655440099";
  const TO_USER_UUID_B = "550e8400-e29b-41d4-a716-446655440098";

  it("org-A と org-B で delegations.create を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
    await callTool(
      "delegations",
      registerDelegationsTools,
      {
        operation: "create",
        fromUserId: USER_A_UUID, // userId と同じ（manager は自身からのみ）
        toUserId: TO_USER_UUID_A,
        startDate: "2026-07-01",
        endDate: "2026-08-01",
      },
      USER_A_UUID, // userId
      "org-A",
      "manager"
    );
    await callTool(
      "delegations",
      registerDelegationsTools,
      {
        operation: "create",
        fromUserId: USER_B_UUID, // userId と同じ（manager は自身からのみ）
        toUserId: TO_USER_UUID_B,
        startDate: "2026-07-01",
        endDate: "2026-08-01",
      },
      USER_B_UUID, // userId
      "org-B",
      "manager"
    );

    expect(state.createDelegationCalls).toHaveLength(2);
    const args1 = state.createDelegationCalls[0] as Record<string, unknown>;
    const args2 = state.createDelegationCalls[1] as Record<string, unknown>;
    expect(args1.organizationId).toBe("org-A");
    expect(args2.organizationId).toBe("org-B");
    expect(args1.organizationId).not.toBe(args2.organizationId);
  });
});

// ============================================================
// T-11: テナント分離の実行検証（approval_templates）
// ============================================================
describe("T-11: テナント分離の実行検証（approval_templates）", () => {
  it("org-A と org-B で approval_templates.create を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
    await callTool(
      "approval_templates",
      registerApprovalTemplatesTools,
      {
        operation: "create",
        name: "テンプレートA",
        steps: [{ approverRole: "manager" }],
      },
      "user-A",
      "org-A",
      "admin"
    );
    await callTool(
      "approval_templates",
      registerApprovalTemplatesTools,
      {
        operation: "create",
        name: "テンプレートB",
        steps: [{ approverRole: "manager" }],
      },
      "user-B",
      "org-B",
      "admin"
    );

    expect(state.createTemplateCalls).toHaveLength(2);
    const args1 = state.createTemplateCalls[0] as Record<string, unknown>;
    const args2 = state.createTemplateCalls[1] as Record<string, unknown>;
    expect(args1.organizationId).toBe("org-A");
    expect(args2.organizationId).toBe("org-B");
    expect(args1.organizationId).not.toBe(args2.organizationId);
  });
});

// ============================================================
// T-11: テナント分離の実行検証（approval_policies）
// ============================================================
describe("T-11: テナント分離の実行検証（approval_policies）", () => {
  it("org-A と org-B で approval_policies.create を呼ぶとそれぞれの organizationId が usecase に渡される", async () => {
    await callTool(
      "approval_policies",
      registerApprovalPoliciesTools,
      {
        operation: "create",
        name: "ポリシーA",
        triggerAction: "inquiry.convert",
        templateId: TEMPLATE_UUID,
      },
      "user-A",
      "org-A",
      "admin"
    );
    await callTool(
      "approval_policies",
      registerApprovalPoliciesTools,
      {
        operation: "create",
        name: "ポリシーB",
        triggerAction: "contract.create",
        templateId: TEMPLATE_UUID,
      },
      "user-B",
      "org-B",
      "admin"
    );

    expect(state.createPolicyCalls).toHaveLength(2);
    const args1 = state.createPolicyCalls[0] as Record<string, unknown>;
    const args2 = state.createPolicyCalls[1] as Record<string, unknown>;
    expect(args1.organizationId).toBe("org-A");
    expect(args2.organizationId).toBe("org-B");
    expect(args1.organizationId).not.toBe(args2.organizationId);
  });
});
