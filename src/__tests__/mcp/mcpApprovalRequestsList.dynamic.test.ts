/**
 * MCP approval_requests ツールの list フィルタと get の実行検証テスト（T-06, T-13）。
 *
 * T-06: 受け入れ基準「自分が承認すべき申請の一覧が承認者資格どおりに絞られることをテストで固定する」
 * T-13: 受け入れ基準「get でシステム連動情報が返される」
 *
 * behavioral test（実行検証）— usecase をモックし、ツールを実際に実行して結果を検証する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { RequestWithSteps } from "@/domain/models/request";
import type { ApprovalStep } from "@/domain/models/approvalStep";

// ---- 状態 ----
const state = {
  listRequestsCalls: [] as unknown[],
  getRequestCalls: [] as unknown[],
  getApprovalStepsCalls: [] as unknown[],
};

// ---- 定数 ----
const ORG_ID = "org-1";
const USER_MGR = "user-mgr-1";
// T-13 用のシステム連動リクエスト UUID（有効な UUID v4 形式）
const SYSTEM_REQUEST_UUID = "550e8400-e29b-41d4-a716-446655440001";

// ---- モックデータ ----

/** T-06 で使うリクエスト一覧 */
const mockRequests: RequestWithSteps[] = [
  {
    id: "req-1",
    title: "申請1",
    formData: {},
    templateId: "tmpl-1",
    status: "pending",
    organizationId: ORG_ID,
    creatorId: "creator-1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
    originType: "manual",
    originPolicyId: null,
    originTriggerAction: null,
    originTriggerEntityId: null,
    approvalSteps: [{ approverRole: "manager", status: "pending", deadline: null }],
  },
  {
    id: "req-2",
    title: "申請2",
    formData: {},
    templateId: "tmpl-1",
    status: "pending",
    organizationId: ORG_ID,
    creatorId: "creator-2",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
    originType: "manual",
    originPolicyId: null,
    originTriggerAction: null,
    originTriggerEntityId: null,
    approvalSteps: [{ approverRole: "finance", status: "pending", deadline: null }],
  },
  {
    id: "req-3",
    title: "申請3（承認済み）",
    formData: {},
    templateId: "tmpl-1",
    status: "approved",
    organizationId: ORG_ID,
    creatorId: "creator-1",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
    originType: "manual",
    originPolicyId: null,
    originTriggerAction: null,
    originTriggerEntityId: null,
    approvalSteps: [],
  },
  {
    id: "req-4",
    title: "申請4（legacy、ステップなし）",
    formData: {},
    templateId: null,
    status: "pending",
    organizationId: ORG_ID,
    creatorId: USER_MGR,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    version: 1,
    originType: "manual",
    originPolicyId: null,
    originTriggerAction: null,
    originTriggerEntityId: null,
    approvalSteps: [],
  },
];

/** T-13 で使うシステム連動リクエスト */
const mockSystemRequest = {
  id: SYSTEM_REQUEST_UUID,
  title: "システム連動申請",
  formData: {},
  templateId: "tmpl-1",
  status: "pending" as const,
  organizationId: ORG_ID,
  creatorId: "creator-1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  version: 1,
  originType: "system" as const,
  originPolicyId: "policy-1",
  originTriggerAction: "inquiry.convert",
  originTriggerEntityId: "inq-uuid-1",
};

/** T-13 で使う承認ステップ配列 */
const mockApprovalSteps: ApprovalStep[] = [
  {
    id: "step-1",
    requestId: SYSTEM_REQUEST_UUID,
    stepOrder: 1,
    approverRole: "manager",
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    status: "pending",
    deadline: null,
    comment: null,
    organizationId: ORG_ID,
    version: 1,
    name: null,
    approverId: null,
  },
];

// ---- 実装を捕捉してからモック ----
import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as listRequestsModule from "@/application/usecases/listRequests";
import * as getRequestModule from "@/application/usecases/getRequest";
import * as getApprovalStepsModule from "@/application/usecases/getApprovalSteps";
import * as approvalTemplateRepositoryModule from "@/infrastructure/repositories/approvalTemplateRepository";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realListRequests = listRequestsModule.listRequests;
const realGetRequest = getRequestModule.getRequest;
const realGetApprovalSteps = getApprovalStepsModule.getApprovalSteps;
const realApprovalTemplateRepository = { ...approvalTemplateRepositoryModule };

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    approveReject: { limit: 30, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/listRequests", () => ({
  listRequests: async (orgId: unknown) => {
    state.listRequestsCalls.push(orgId);
    return mockRequests;
  },
}));

mock.module("@/application/usecases/getRequest", () => ({
  getRequest: async (requestId: unknown, orgId: unknown) => {
    state.getRequestCalls.push({ requestId, orgId });
    if (requestId === SYSTEM_REQUEST_UUID) return mockSystemRequest;
    return null;
  },
}));

mock.module("@/application/usecases/getApprovalSteps", () => ({
  getApprovalSteps: async (data: unknown) => {
    state.getApprovalStepsCalls.push(data);
    return mockApprovalSteps;
  },
}));

mock.module("@/infrastructure/repositories/approvalTemplateRepository", () => ({
  findByOrganization: async () => [],
  findById: async () => null,
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/listRequests", () => ({
    listRequests: realListRequests,
  }));
  mock.module("@/application/usecases/getRequest", () => ({
    getRequest: realGetRequest,
  }));
  mock.module("@/application/usecases/getApprovalSteps", () => ({
    getApprovalSteps: realGetApprovalSteps,
  }));
  mock.module("@/infrastructure/repositories/approvalTemplateRepository", () =>
    realApprovalTemplateRepository
  );
});

// モック設定後に import する
const { registerApprovalRequestsTools } = await import(
  "../../app/api/mcp/tools/approvalRequests"
);

// ---- ヘルパー ----
async function callTool(
  args: Record<string, unknown>,
  userId: string,
  role: string,
  organizationId = ORG_ID
): Promise<{ isError?: boolean; text: string; data: unknown }> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  registerApprovalRequestsTools(server);
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
      params: { name: "approval_requests", arguments: args },
    }),
  });
  const response = await transport.handleRequest(request, { authInfo });
  const body = (await response.json()) as {
    result?: { isError?: boolean; content?: { text: string }[] };
  };
  await transport.close();
  const text = body.result?.content?.[0]?.text ?? "";
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { isError: body.result?.isError, text, data };
}

beforeEach(() => {
  state.listRequestsCalls = [];
  state.getRequestCalls = [];
  state.getApprovalStepsCalls = [];
});

// ============================================================
// T-06: action_required フィルタの承認者資格テスト
// ============================================================
describe("T-06: approval_requests.list — action_required フィルタ（承認者資格）", () => {
  it("manager ロールで filter=action_required を呼ぶと req-1 と req-4 のみ返される", async () => {
    const result = await callTool(
      { operation: "list", filter: "action_required" },
      USER_MGR,
      "manager"
    );

    expect(result.isError).toBeUndefined();
    const items = result.data as Array<{ id: string }>;
    const ids = items.map((r) => r.id);
    expect(ids).toContain("req-1");
    expect(ids).toContain("req-4");
    expect(ids).not.toContain("req-2");
    expect(ids).not.toContain("req-3");
    expect(ids).toHaveLength(2);
  });

  it("finance ロールで filter=action_required を呼ぶと req-2 と req-4 のみ返される", async () => {
    const result = await callTool(
      { operation: "list", filter: "action_required" },
      "user-finance-1",
      "finance"
    );

    expect(result.isError).toBeUndefined();
    const items = result.data as Array<{ id: string }>;
    const ids = items.map((r) => r.id);
    expect(ids).toContain("req-2");
    expect(ids).toContain("req-4");
    expect(ids).not.toContain("req-1");
    expect(ids).not.toContain("req-3");
    expect(ids).toHaveLength(2);
  });

  it("member ロールで filter=action_required を呼ぶと req-4 のみ返される（legacy は含まれる）", async () => {
    const result = await callTool(
      { operation: "list", filter: "action_required" },
      "user-member-1",
      "member"
    );

    expect(result.isError).toBeUndefined();
    const items = result.data as Array<{ id: string }>;
    const ids = items.map((r) => r.id);
    expect(ids).toContain("req-4");
    expect(ids).not.toContain("req-1");
    expect(ids).not.toContain("req-2");
    expect(ids).not.toContain("req-3");
    expect(ids).toHaveLength(1);
  });

  it("filter=my_requests を呼ぶと creatorId が userId に一致するリクエストのみ返される", async () => {
    // req-4 の creatorId = USER_MGR
    const result = await callTool(
      { operation: "list", filter: "my_requests" },
      USER_MGR,
      "manager"
    );

    expect(result.isError).toBeUndefined();
    const items = result.data as Array<{ id: string }>;
    const ids = items.map((r) => r.id);
    // req-4 のみ creatorId=USER_MGR
    expect(ids).toContain("req-4");
    expect(ids).not.toContain("req-1");
    expect(ids).not.toContain("req-2");
    expect(ids).not.toContain("req-3");
    expect(ids).toHaveLength(1);
  });
});

// ============================================================
// T-13: get でシステム連動情報が返されるテスト
// ============================================================
describe("T-13: approval_requests.get — システム連動情報の返却", () => {
  it("originType=system のリクエストの get で originType, originTriggerAction, originTriggerEntityId, approvalSteps が含まれる", async () => {
    const result = await callTool(
      { operation: "get", requestId: SYSTEM_REQUEST_UUID },
      "user-admin-1",
      "admin"
    );

    expect(result.isError).toBeUndefined();
    const data = result.data as Record<string, unknown>;

    // システム連動フィールドが含まれること
    expect(data.originType).toBe("system");
    expect(data.originTriggerAction).toBe("inquiry.convert");
    expect(data.originTriggerEntityId).toBe("inq-uuid-1");

    // approvalSteps 配列が含まれること
    expect(Array.isArray(data.approvalSteps)).toBe(true);
    const steps = data.approvalSteps as ApprovalStep[];
    expect(steps.length).toBeGreaterThan(0);
  });

  it("get は getRequest と getApprovalSteps の両方を正しい引数で呼ぶ", async () => {
    await callTool(
      { operation: "get", requestId: SYSTEM_REQUEST_UUID },
      "user-admin-1",
      "admin"
    );

    // getRequest が正しく呼ばれた
    expect(state.getRequestCalls).toHaveLength(1);
    const getArgs = state.getRequestCalls[0] as Record<string, unknown>;
    expect(getArgs.requestId).toBe(SYSTEM_REQUEST_UUID);
    expect(getArgs.orgId).toBe(ORG_ID);

    // getApprovalSteps も呼ばれた（getRequest が成功したため）
    expect(state.getApprovalStepsCalls).toHaveLength(1);
    const stepsArgs = state.getApprovalStepsCalls[0] as Record<string, unknown>;
    expect(stepsArgs.requestId).toBe(SYSTEM_REQUEST_UUID);
    expect(stepsArgs.organizationId).toBe(ORG_ID);
  });

  it("存在しないリクエストの get は isError=true を返す", async () => {
    const result = await callTool(
      { operation: "get", requestId: "550e8400-e29b-41d4-a716-446655440099" },
      "user-admin-1",
      "admin"
    );

    expect(result.isError).toBe(true);
    expect(result.text).toContain("承認リクエストが見つかりません");
  });
});
