/**
 * MCP update 系ツールの部分更新 behavioral テスト。
 *
 * T-04: 各多フィールド update 操作について、省略フィールドが undefined として usecase に渡ることを固定する。
 * T-05: null 指定が usecase に null として渡ることを固定する（undefined との区別）。
 * T-06: interactions update_meeting の internalAttendees / externalContactIds が
 *        独立した部分更新フィールドとして usecase に渡ることを固定する。
 *
 * 実 MCP transport 経由で tools/call を発行し、usecase mock に渡された引数を検証する。
 * 各操作の usecase のみ mock する（rate limit は共通で mock）。
 * 個別 usecase ファイルをモックし、mock 汚染を afterAll で復元する。
 */

import { describe, it, expect, mock, beforeEach, afterAll } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

// ---------------------------------------------------------------------------
// 共有状態
// ---------------------------------------------------------------------------

const state = {
  updateDealCalls: [] as unknown[],
  updateClientCalls: [] as unknown[],
  updateClientContactCalls: [] as unknown[],
  updateInquiryCalls: [] as unknown[],
  updateContractCalls: [] as unknown[],
  updateInvoiceCalls: [] as unknown[],
  updateActionItemCalls: [] as unknown[],
  updateRevenueTargetCalls: [] as unknown[],
  updateTemplateCalls: [] as unknown[],
  updatePolicyCalls: [] as unknown[],
  updateMeetingCalls: [] as unknown[],
};

// ---------------------------------------------------------------------------
// 実装を捕捉してから mock.module を呼ぶ。afterAll で復元する。
// ---------------------------------------------------------------------------

import * as rateLimitModule from "@/infrastructure/rateLimit";
import * as updateDealModule from "@/application/usecases/updateDeal";
import * as updateClientModule from "@/application/usecases/updateClient";
import * as updateClientContactModule from "@/application/usecases/updateClientContact";
import * as updateInquiryModule from "@/application/usecases/updateInquiry";
import * as updateContractModule from "@/application/usecases/updateContract";
import * as updateInvoiceModule from "@/application/usecases/updateInvoice";
import * as updateActionItemModule from "@/application/usecases/updateActionItem";
import * as updateRevenueTargetModule from "@/application/usecases/updateRevenueTarget";
import * as updateTemplateModule from "@/application/usecases/updateTemplate";
import * as updatePolicyModule from "@/application/usecases/updatePolicy";
import * as updateMeetingModule from "@/application/usecases/updateMeeting";

const realRateLimit = {
  checkRateLimit: rateLimitModule.checkRateLimit,
  RATE_LIMITS: rateLimitModule.RATE_LIMITS,
};
const realUpdateDeal = updateDealModule.updateDeal;
const realUpdateClient = updateClientModule.updateClient;
const realUpdateClientContact = updateClientContactModule.updateClientContact;
const realUpdateInquiry = updateInquiryModule.updateInquiry;
const realUpdateContract = updateContractModule.updateContract;
const realUpdateInvoice = updateInvoiceModule.updateInvoice;
const realUpdateActionItem = updateActionItemModule.updateActionItem;
const realUpdateRevenueTarget = updateRevenueTargetModule.updateRevenueTarget;
const realUpdateTemplate = updateTemplateModule.updateTemplate;
const realUpdatePolicy = updatePolicyModule.updatePolicy;
const realUpdateMeeting = updateMeetingModule.updateMeeting;

const EXTERNAL_CONTACT_UUID = "aaaabbbb-e89b-12d3-a456-426614174001";

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const MOCK_DEAL = { id: "deal-1", title: "テスト案件" };
const MOCK_CLIENT = { id: "client-1", name: "テスト顧客" };
const MOCK_CONTACT = { id: "contact-1", name: "テスト担当者" };
const MOCK_INQUIRY = { id: "inquiry-1", title: "テスト引合" };
const MOCK_CONTRACT = { id: "contract-1", title: "テスト契約" };
const MOCK_INVOICE = { id: "invoice-1", title: "テスト請求" };
const MOCK_ACTION_ITEM = { id: "task-1", description: "テストタスク" };
const MOCK_TARGET = { id: "target-1", targetAmount: 1000000 };
const MOCK_TEMPLATE = { id: "template-1", name: "テストテンプレート" };
const MOCK_POLICY = { id: "policy-1", name: "テストポリシー" };
const MOCK_MEETING = { id: "meeting-1", kind: "meeting" };

mock.module("@/infrastructure/rateLimit", () => ({
  checkRateLimit: async () => ({ allowed: true }),
  RATE_LIMITS: {
    createRequest: { limit: 100, windowMs: 60_000 },
    search: { limit: 120, windowMs: 60_000 },
  },
}));

mock.module("@/application/usecases/updateDeal", () => ({
  updateDeal: async (input: unknown) => {
    state.updateDealCalls.push(input);
    return { ok: true as const, deal: MOCK_DEAL };
  },
}));

mock.module("@/application/usecases/updateClient", () => ({
  updateClient: async (input: unknown) => {
    state.updateClientCalls.push(input);
    return { ok: true as const, client: MOCK_CLIENT };
  },
}));

mock.module("@/application/usecases/updateClientContact", () => ({
  updateClientContact: async (input: unknown) => {
    state.updateClientContactCalls.push(input);
    return { ok: true as const, contact: MOCK_CONTACT };
  },
}));

mock.module("@/application/usecases/updateInquiry", () => ({
  updateInquiry: async (input: unknown) => {
    state.updateInquiryCalls.push(input);
    return { ok: true as const, inquiry: MOCK_INQUIRY };
  },
}));

mock.module("@/application/usecases/updateContract", () => ({
  updateContract: async (input: unknown) => {
    state.updateContractCalls.push(input);
    return { ok: true as const, contract: MOCK_CONTRACT };
  },
}));

mock.module("@/application/usecases/updateInvoice", () => ({
  updateInvoice: async (input: unknown) => {
    state.updateInvoiceCalls.push(input);
    return { ok: true as const, invoice: MOCK_INVOICE };
  },
}));

mock.module("@/application/usecases/updateActionItem", () => ({
  updateActionItem: async (input: unknown) => {
    state.updateActionItemCalls.push(input);
    return { ok: true as const, actionItem: MOCK_ACTION_ITEM };
  },
}));

mock.module("@/application/usecases/updateRevenueTarget", () => ({
  updateRevenueTarget: async (input: unknown) => {
    state.updateRevenueTargetCalls.push(input);
    return { ok: true as const, target: MOCK_TARGET };
  },
}));

mock.module("@/application/usecases/updateTemplate", () => ({
  updateTemplate: async (input: unknown) => {
    state.updateTemplateCalls.push(input);
    return { ok: true as const, template: MOCK_TEMPLATE };
  },
}));

mock.module("@/application/usecases/updatePolicy", () => ({
  updatePolicy: async (input: unknown) => {
    state.updatePolicyCalls.push(input);
    return { ok: true as const, policy: MOCK_POLICY };
  },
}));

mock.module("@/application/usecases/updateMeeting", () => ({
  updateMeeting: async (input: unknown) => {
    state.updateMeetingCalls.push(input);
    return { ok: true as const, meeting: MOCK_MEETING };
  },
}));

afterAll(() => {
  mock.module("@/infrastructure/rateLimit", () => realRateLimit);
  mock.module("@/application/usecases/updateDeal", () => ({ updateDeal: realUpdateDeal }));
  mock.module("@/application/usecases/updateClient", () => ({ updateClient: realUpdateClient }));
  mock.module("@/application/usecases/updateClientContact", () => ({
    updateClientContact: realUpdateClientContact,
  }));
  mock.module("@/application/usecases/updateInquiry", () => ({ updateInquiry: realUpdateInquiry }));
  mock.module("@/application/usecases/updateContract", () => ({ updateContract: realUpdateContract }));
  mock.module("@/application/usecases/updateInvoice", () => ({ updateInvoice: realUpdateInvoice }));
  mock.module("@/application/usecases/updateActionItem", () => ({
    updateActionItem: realUpdateActionItem,
  }));
  mock.module("@/application/usecases/updateRevenueTarget", () => ({
    updateRevenueTarget: realUpdateRevenueTarget,
  }));
  mock.module("@/application/usecases/updateTemplate", () => ({ updateTemplate: realUpdateTemplate }));
  mock.module("@/application/usecases/updatePolicy", () => ({ updatePolicy: realUpdatePolicy }));
  mock.module("@/application/usecases/updateMeeting", () => ({ updateMeeting: realUpdateMeeting }));
});

// ---------------------------------------------------------------------------
// モック設定後に動的 import する（モック済みバージョンが使われる）
// ---------------------------------------------------------------------------

const { registerDealsTools } = await import("../../app/api/mcp/tools/deals");
const { registerClientsTools } = await import("../../app/api/mcp/tools/clients");
const { registerInquiriesTools } = await import("../../app/api/mcp/tools/inquiries");
const { registerContractsTools } = await import("../../app/api/mcp/tools/contracts");
const { registerInvoicesTools } = await import("../../app/api/mcp/tools/invoices");
const { registerTasksTools } = await import("../../app/api/mcp/tools/tasks");
const { registerRevenueTargetsTools } = await import("../../app/api/mcp/tools/revenueTargets");
const { registerApprovalTemplatesTools } = await import(
  "../../app/api/mcp/tools/approvalTemplates"
);
const { registerApprovalPoliciesTools } = await import(
  "../../app/api/mcp/tools/approvalPolicies"
);
const { registerInteractionsTools } = await import("../../app/api/mcp/tools/interactions");

// ---------------------------------------------------------------------------
// UUID 定数
// ---------------------------------------------------------------------------

const DEAL_UUID = "123e4567-e89b-12d3-a456-426614174001";
const CLIENT_UUID = "123e4567-e89b-12d3-a456-426614174002";
const CONTACT_UUID = "123e4567-e89b-12d3-a456-426614174003";
const INQUIRY_UUID = "123e4567-e89b-12d3-a456-426614174004";
const CONTRACT_UUID = "123e4567-e89b-12d3-a456-426614174005";
const INVOICE_UUID = "123e4567-e89b-12d3-a456-426614174006";
const TASK_UUID = "123e4567-e89b-12d3-a456-426614174007";
const TARGET_UUID = "123e4567-e89b-12d3-a456-426614174008";
const TEMPLATE_UUID = "123e4567-e89b-12d3-a456-426614174009";
const POLICY_UUID = "123e4567-e89b-12d3-a456-426614174010";
const MEETING_UUID = "123e4567-e89b-12d3-a456-426614174011";

// ---------------------------------------------------------------------------
// ツール呼び出しヘルパー
// ---------------------------------------------------------------------------

type ToolResult = { isError?: boolean; text: string };

async function callTool(
  toolName: string,
  register: (server: McpServer) => void,
  args: Record<string, unknown>,
  role = "admin"
): Promise<ToolResult> {
  const server = new McpServer({ name: "clearflow-test", version: "1.0.0" });
  register(server);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const authInfo: AuthInfo = {
    token: "cfp_test",
    clientId: "user-A",
    scopes: [],
    extra: { userId: "user-A", organizationId: "org-1", role },
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

const callDeals = (args: Record<string, unknown>) =>
  callTool("deals", registerDealsTools, args);
const callClients = (args: Record<string, unknown>) =>
  callTool("clients", registerClientsTools, args);
const callInquiries = (args: Record<string, unknown>) =>
  callTool("inquiries", registerInquiriesTools, args);
const callContracts = (args: Record<string, unknown>) =>
  callTool("contracts", registerContractsTools, args, "finance");
const callInvoices = (args: Record<string, unknown>) =>
  callTool("invoices", registerInvoicesTools, args, "finance");
const callTasks = (args: Record<string, unknown>) =>
  callTool("tasks", registerTasksTools, args);
const callRevenueTargets = (args: Record<string, unknown>) =>
  callTool("revenue_targets", registerRevenueTargetsTools, args);
const callApprovalTemplates = (args: Record<string, unknown>) =>
  callTool("approval_templates", registerApprovalTemplatesTools, args);
const callApprovalPolicies = (args: Record<string, unknown>) =>
  callTool("approval_policies", registerApprovalPoliciesTools, args);
const callInteractions = (args: Record<string, unknown>) =>
  callTool("interactions", registerInteractionsTools, args);

// ---------------------------------------------------------------------------
// beforeEach: 状態リセット
// ---------------------------------------------------------------------------

beforeEach(() => {
  state.updateDealCalls = [];
  state.updateClientCalls = [];
  state.updateClientContactCalls = [];
  state.updateInquiryCalls = [];
  state.updateContractCalls = [];
  state.updateInvoiceCalls = [];
  state.updateActionItemCalls = [];
  state.updateRevenueTargetCalls = [];
  state.updateTemplateCalls = [];
  state.updatePolicyCalls = [];
  state.updateMeetingCalls = [];
});

// ===========================================================================
// T-04: 省略フィールドが undefined として usecase に渡る
// ===========================================================================

describe("T-04: 省略フィールドが undefined で渡る（PATCH セマンティクス）", () => {
  describe("deals.update — title のみ指定", () => {
    it("省略した description / estimatedAmount 等が undefined として updateDeal に渡る", async () => {
      const result = await callDeals({
        operation: "update",
        dealId: DEAL_UUID,
        title: "新しい案件名",
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateDealCalls).toHaveLength(1);
      const args = state.updateDealCalls[0] as Record<string, unknown>;
      expect(args.title).toBe("新しい案件名");
      expect(args.description).toBeUndefined();
      expect(args.estimatedAmount).toBeUndefined();
      expect(args.contractType).toBeUndefined();
      expect(args.assigneeId).toBeUndefined();
    });
  });

  describe("clients.update — name のみ指定", () => {
    it("省略した industry / size / address / notes が undefined として updateClient に渡る", async () => {
      const result = await callClients({
        operation: "update",
        clientId: CLIENT_UUID,
        name: "新しい顧客名",
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateClientCalls).toHaveLength(1);
      const args = state.updateClientCalls[0] as { data: Record<string, unknown> };
      expect(args.data.name).toBe("新しい顧客名");
      expect(args.data.industry).toBeUndefined();
      expect(args.data.size).toBeUndefined();
      expect(args.data.address).toBeUndefined();
      expect(args.data.notes).toBeUndefined();
    });
  });

  describe("clients.update_contact — name のみ指定", () => {
    it("省略した department / position / email / phone / isPrimary が undefined として updateClientContact に渡る", async () => {
      const result = await callClients({
        operation: "update_contact",
        clientId: CLIENT_UUID,
        contactId: CONTACT_UUID,
        name: "新しい担当者名",
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateClientContactCalls).toHaveLength(1);
      const args = state.updateClientContactCalls[0] as { data: Record<string, unknown> };
      expect(args.data.name).toBe("新しい担当者名");
      expect(args.data.department).toBeUndefined();
      expect(args.data.position).toBeUndefined();
      expect(args.data.email).toBeUndefined();
      expect(args.data.phone).toBeUndefined();
      expect(args.data.isPrimary).toBeUndefined();
    });
  });

  describe("inquiries.update — title のみ指定", () => {
    it("省略した description / contactNote / budget 等が undefined として updateInquiry に渡る", async () => {
      const result = await callInquiries({
        operation: "update",
        inquiryId: INQUIRY_UUID,
        title: "新しい件名",
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateInquiryCalls).toHaveLength(1);
      const args = state.updateInquiryCalls[0] as Record<string, unknown>;
      expect(args.title).toBe("新しい件名");
      expect(args.description).toBeUndefined();
      expect(args.contactNote).toBeUndefined();
      expect(args.budget).toBeUndefined();
      expect(args.timeline).toBeUndefined();
      expect(args.clientId).toBeUndefined();
      expect(args.assigneeId).toBeUndefined();
    });
  });

  describe("contracts.update — title のみ指定", () => {
    it("省略した contractType / amount / startDate 等が undefined として updateContract に渡る", async () => {
      const result = await callContracts({
        operation: "update",
        contractId: CONTRACT_UUID,
        title: "新しい契約名",
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateContractCalls).toHaveLength(1);
      const args = state.updateContractCalls[0] as Record<string, unknown>;
      expect(args.title).toBe("新しい契約名");
      expect(args.contractType).toBeUndefined();
      expect(args.amount).toBeUndefined();
      expect(args.startDate).toBeUndefined();
      expect(args.endDate).toBeUndefined();
      expect(args.paymentTerms).toBeUndefined();
    });
  });

  describe("invoices.update — title のみ指定", () => {
    it("省略した amount / issueDate / dueDate / notes が undefined として updateInvoice に渡る", async () => {
      const result = await callInvoices({
        operation: "update",
        invoiceId: INVOICE_UUID,
        title: "新しい請求タイトル",
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateInvoiceCalls).toHaveLength(1);
      const args = state.updateInvoiceCalls[0] as Record<string, unknown>;
      expect(args.title).toBe("新しい請求タイトル");
      expect(args.amount).toBeUndefined();
      expect(args.issueDate).toBeUndefined();
      expect(args.dueDate).toBeUndefined();
      expect(args.notes).toBeUndefined();
    });
  });

  describe("tasks.update — description のみ指定", () => {
    it("省略した assigneeId / dueDate / interactionId 等が undefined として updateActionItem に渡る", async () => {
      const result = await callTasks({
        operation: "update",
        id: TASK_UUID,
        description: "新しいタスク内容",
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateActionItemCalls).toHaveLength(1);
      const args = state.updateActionItemCalls[0] as Record<string, unknown>;
      expect(args.description).toBe("新しいタスク内容");
      expect(args.assigneeId).toBeUndefined();
      expect(args.dueDate).toBeUndefined();
      expect(args.interactionId).toBeUndefined();
      expect(args.dealId).toBeUndefined();
      expect(args.inquiryId).toBeUndefined();
    });
  });

  describe("revenue_targets.update — targetAmount のみ指定", () => {
    it("省略した periodStart / periodEnd が undefined として updateRevenueTarget に渡る", async () => {
      const result = await callRevenueTargets({
        operation: "update",
        id: TARGET_UUID,
        targetAmount: 2000000,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateRevenueTargetCalls).toHaveLength(1);
      const args = state.updateRevenueTargetCalls[0] as Record<string, unknown>;
      expect(args.targetAmount).toBe(2000000);
      expect(args.periodStart).toBeUndefined();
      expect(args.periodEnd).toBeUndefined();
    });
  });

  describe("approval_templates.update — name のみ指定", () => {
    it("省略した steps / fields が undefined として updateTemplate に渡る", async () => {
      const result = await callApprovalTemplates({
        operation: "update",
        templateId: TEMPLATE_UUID,
        name: "新しいテンプレート名",
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateTemplateCalls).toHaveLength(1);
      const args = state.updateTemplateCalls[0] as Record<string, unknown>;
      expect(args.name).toBe("新しいテンプレート名");
      expect(args.steps).toBeUndefined();
      expect(args.fields).toBeUndefined();
    });
  });

  describe("approval_policies.update — name のみ指定", () => {
    it("省略した triggerAction / templateId / description / condition 系が undefined として updatePolicy に渡る", async () => {
      const result = await callApprovalPolicies({
        operation: "update",
        policyId: POLICY_UUID,
        name: "新しいポリシー名",
      });

      expect(result.isError).toBeUndefined();
      expect(state.updatePolicyCalls).toHaveLength(1);
      const args = state.updatePolicyCalls[0] as Record<string, unknown>;
      expect(args.name).toBe("新しいポリシー名");
      expect(args.triggerAction).toBeUndefined();
      expect(args.templateId).toBeUndefined();
      expect(args.description).toBeUndefined();
      expect(args.conditionField).toBeUndefined();
      expect(args.conditionOperator).toBeUndefined();
      expect(args.conditionValue).toBeUndefined();
    });
  });
});

// ===========================================================================
// T-05: null 指定が usecase に null として渡る（undefined と区別される）
// ===========================================================================

describe("T-05: null 指定が usecase に null として渡る（クリアセマンティクス）", () => {
  describe("deals.update — description: null", () => {
    it("description: null が updateDeal に null として渡り、undefined とは区別される", async () => {
      const result = await callDeals({
        operation: "update",
        dealId: DEAL_UUID,
        description: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateDealCalls).toHaveLength(1);
      const args = state.updateDealCalls[0] as Record<string, unknown>;
      expect(args.description).toBeNull();
      expect(args.title).toBeUndefined();
    });
  });

  describe("clients.update — industry: null", () => {
    it("industry: null が updateClient の data.industry に null として渡る", async () => {
      const result = await callClients({
        operation: "update",
        clientId: CLIENT_UUID,
        industry: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateClientCalls).toHaveLength(1);
      const args = state.updateClientCalls[0] as { data: Record<string, unknown> };
      expect(args.data.industry).toBeNull();
      expect(args.data.name).toBeUndefined();
    });
  });

  describe("clients.update_contact — department: null", () => {
    it("department: null が updateClientContact の data.department に null として渡る", async () => {
      const result = await callClients({
        operation: "update_contact",
        clientId: CLIENT_UUID,
        contactId: CONTACT_UUID,
        department: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateClientContactCalls).toHaveLength(1);
      const args = state.updateClientContactCalls[0] as { data: Record<string, unknown> };
      expect(args.data.department).toBeNull();
      expect(args.data.name).toBeUndefined();
    });
  });

  describe("inquiries.update — description: null", () => {
    it("description: null が updateInquiry に null として渡る", async () => {
      const result = await callInquiries({
        operation: "update",
        inquiryId: INQUIRY_UUID,
        description: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateInquiryCalls).toHaveLength(1);
      const args = state.updateInquiryCalls[0] as Record<string, unknown>;
      expect(args.description).toBeNull();
      expect(args.title).toBeUndefined();
    });
  });

  describe("contracts.update — endDate: null", () => {
    it("endDate: null が updateContract に null として渡る", async () => {
      const result = await callContracts({
        operation: "update",
        contractId: CONTRACT_UUID,
        endDate: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateContractCalls).toHaveLength(1);
      const args = state.updateContractCalls[0] as Record<string, unknown>;
      expect(args.endDate).toBeNull();
      expect(args.title).toBeUndefined();
    });
  });

  describe("invoices.update — issueDate: null", () => {
    it("issueDate: null が updateInvoice に null として渡る（Date 変換なし）", async () => {
      const result = await callInvoices({
        operation: "update",
        invoiceId: INVOICE_UUID,
        issueDate: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateInvoiceCalls).toHaveLength(1);
      const args = state.updateInvoiceCalls[0] as Record<string, unknown>;
      expect(args.issueDate).toBeNull();
      expect(args.title).toBeUndefined();
    });
  });

  describe("tasks.update — assigneeId: null", () => {
    it("assigneeId: null が updateActionItem に null として渡る", async () => {
      const result = await callTasks({
        operation: "update",
        id: TASK_UUID,
        assigneeId: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateActionItemCalls).toHaveLength(1);
      const args = state.updateActionItemCalls[0] as Record<string, unknown>;
      expect(args.assigneeId).toBeNull();
      expect(args.description).toBeUndefined();
    });
  });

  describe("approval_policies.update — description: null", () => {
    it("description: null が updatePolicy に null として渡る（PATCH 是正後）", async () => {
      const result = await callApprovalPolicies({
        operation: "update",
        policyId: POLICY_UUID,
        description: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updatePolicyCalls).toHaveLength(1);
      const args = state.updatePolicyCalls[0] as Record<string, unknown>;
      expect(args.description).toBeNull();
      expect(args.name).toBeUndefined();
    });
  });

  describe("interactions.update_meeting — location: null", () => {
    it("location: null が updateMeeting に null として渡る（TC-006 統合確認）", async () => {
      const result = await callInteractions({
        operation: "update_meeting",
        meetingId: MEETING_UUID,
        location: null,
      });

      expect(result.isError).toBeUndefined();
      expect(state.updateMeetingCalls).toHaveLength(1);
      const args = state.updateMeetingCalls[0] as Record<string, unknown>;
      expect(args.location).toBeNull();
      expect(args.summary).toBeUndefined();
    });
  });
});

// ===========================================================================
// T-06: interactions update_meeting の attendees 部分更新（handler → usecase 境界）
// ===========================================================================

describe("T-06: interactions update_meeting — attendees 内部/外部独立部分更新", () => {
  it("internalAttendees のみ指定 → usecase に internalAttendees が渡り externalContactIds は undefined", async () => {
    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      internalAttendees: ["内部C"],
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const args = state.updateMeetingCalls[0] as Record<string, unknown>;
    // internalAttendees が MeetingAttendee[] に変換されて渡る
    expect(Array.isArray(args.internalAttendees)).toBe(true);
    const internal = args.internalAttendees as { name: string; isExternal: boolean }[];
    expect(internal).toHaveLength(1);
    expect(internal[0].name).toBe("内部C");
    expect(internal[0].isExternal).toBe(false);
    // externalContactIds は省略されたので undefined（反対側を保持する）
    expect(args.externalContactIds).toBeUndefined();
  });

  it("externalContactIds のみ指定 → usecase に配列のまま渡り internalAttendees は undefined", async () => {
    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      externalContactIds: [EXTERNAL_CONTACT_UUID],
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const args = state.updateMeetingCalls[0] as Record<string, unknown>;
    // contactId の解決（氏名スナップショット取得）は usecase 側の責務。ID がそのまま渡る
    expect(args.externalContactIds).toEqual([EXTERNAL_CONTACT_UUID]);
    // internalAttendees は省略されたので undefined（反対側を保持する）
    expect(args.internalAttendees).toBeUndefined();
  });

  it("両方指定 → internalAttendees と externalContactIds の両方が渡る", async () => {
    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      internalAttendees: ["内部A", "内部B"],
      externalContactIds: [EXTERNAL_CONTACT_UUID],
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const args = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(Array.isArray(args.internalAttendees)).toBe(true);
    expect((args.internalAttendees as unknown[]).length).toBe(2);
    expect(args.externalContactIds).toEqual([EXTERNAL_CONTACT_UUID]);
  });

  it("両方省略 → internalAttendees と externalContactIds の両方が undefined", async () => {
    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      summary: "新サマリ",
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const args = state.updateMeetingCalls[0] as Record<string, unknown>;
    expect(args.internalAttendees).toBeUndefined();
    expect(args.externalContactIds).toBeUndefined();
    expect(args.summary).toBe("新サマリ");
  });

  it("internalAttendees: null → 空配列（クリア）として usecase に渡る", async () => {
    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      internalAttendees: null,
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const args = state.updateMeetingCalls[0] as Record<string, unknown>;
    // null は空配列に変換される（内部参加者クリア）
    expect(Array.isArray(args.internalAttendees)).toBe(true);
    expect((args.internalAttendees as unknown[]).length).toBe(0);
    // externalContactIds は省略されたので undefined
    expect(args.externalContactIds).toBeUndefined();
  });

  it("externalContactIds: null → null（クリア）として usecase に渡る", async () => {
    const result = await callInteractions({
      operation: "update_meeting",
      meetingId: MEETING_UUID,
      externalContactIds: null,
    });

    expect(result.isError).toBeUndefined();
    expect(state.updateMeetingCalls).toHaveLength(1);
    const args = state.updateMeetingCalls[0] as Record<string, unknown>;
    // null はそのまま渡り、usecase が社外参加者クリアとして解釈する
    expect(args.externalContactIds).toBeNull();
    // internalAttendees は省略されたので undefined
    expect(args.internalAttendees).toBeUndefined();
  });
});
