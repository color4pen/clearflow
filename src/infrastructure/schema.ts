import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["admin", "member", "manager", "finance"]);
export const webhookDeliveryStatusEnum = pgEnum("webhook_delivery_status", [
  "pending",
  "delivered",
  "failed",
]);
export const requestStatusEnum = pgEnum("request_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "revision",
  "expired",
]);
export const approvalStepStatusEnum = pgEnum("approval_step_status", [
  "pending",
  "approved",
  "rejected",
]);
export const inquirySourceEnum = pgEnum("inquiry_source", [
  "web",
  "phone",
  "email",
  "referral",
  "agent_service",
  "exhibition",
  "other",
]);
export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "new",
  "converted",
  "declined",
]);
export const meetingTypeEnum = pgEnum("meeting_type", [
  "hearing",
  "proposal",
  "negotiation",
  "closing",
  "followup",
]);
export const dealPhaseEnum = pgEnum("deal_phase", [
  "proposal_prep",
  "proposed",
  "negotiation",
  "won",
  "lost",
]);
export const contractStatusEnum = pgEnum("contract_status", [
  "active",
  "completed",
  "cancelled",
]);
export const renewalTypeEnum = pgEnum("renewal_type", ["one_time", "recurring"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["scheduled", "invoiced", "paid", "overdue"]);

// Organizations table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table (custom, includes auth fields for DrizzleAdapter compatibility)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  hashedPassword: text("hashed_password").notNull(),
  name: text("name").notNull(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  role: roleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Approval templates table (must be defined before requests due to FK)
export const approvalTemplates = pgTable("approval_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  steps: jsonb("steps").notNull(),
  fields: jsonb("fields").notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Requests table
export const requests = pgTable("requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  formData: jsonb("form_data").notNull().default({}),
  templateId: uuid("template_id").references(() => approvalTemplates.id, { onDelete: "set null" }),
  status: requestStatusEnum("status").notNull().default("draft"),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  version: integer("version").notNull().default(1),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Approval steps table
export const approvalSteps = pgTable("approval_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => requests.id),
  stepOrder: integer("step_order").notNull(),
  approverRole: text("approver_role").notNull(),
  status: approvalStepStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  comment: text("comment"),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  version: integer("version").notNull().default(1),
  deadline: timestamp("deadline"),
});

// Idempotency keys table
export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(),
  action: text("action").notNull(),
  result: jsonb("result").notNull(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // Unique per (key, organizationId) so tenants cannot collide on the same key.
  // A global key-only unique constraint would let Org A's key silently block
  // Org B's idempotency guarantee if the 23505 error is swallowed.
  unique("idempotency_keys_key_org_unique").on(table.key, table.organizationId),
]);

// Rate limit records table
export const rateLimitRecords = pgTable("rate_limit_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Webhook endpoints table
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  events: text("events").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Webhook deliveries table
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpointId: uuid("endpoint_id")
    .notNull()
    .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: jsonb("payload").notNull(),
  status: webhookDeliveryStatusEnum("status").notNull().default("pending"),
  statusCode: integer("status_code"),
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  nextRetryAt: timestamp("next_retry_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Approval delegations table
export const approvalDelegations = pgTable(
  "approval_delegations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id),
    toUserId: uuid("to_user_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("approval_delegations_to_user_org_active_idx").on(
      table.toUserId,
      table.organizationId,
      table.isActive
    ),
  ]
);

// Clients table (企業顧客)
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  name: text("name").notNull(),
  industry: text("industry"),
  size: text("size"),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Client contacts table (顧客担当者)
export const clientContacts = pgTable("client_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  name: text("name").notNull(),
  department: text("department"),
  position: text("position"),
  email: text("email"),
  phone: text("phone"),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inquiries table (引き合い)
export const inquiries = pgTable("inquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  // 引き合い受付時点では顧客が未確定でもよいため nullable
  clientId: uuid("client_id").references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  source: inquirySourceEnum("source").notNull(),
  status: inquiryStatusEnum("status").notNull().default("new"),
  budget: integer("budget"),
  timeline: text("timeline"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // 楽観ロック: converted 遷移で重複 Deal 作成を防ぐ
  version: integer("version").notNull().default(1),
});

// Meetings table (商談記録)
export const meetings = pgTable("meetings", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  dealId: uuid("deal_id").references(() => deals.id),
  inquiryId: uuid("inquiry_id").references(() => inquiries.id),
  type: meetingTypeEnum("type").notNull(),
  date: timestamp("date").notNull(),
  location: text("location"),
  // Array<{ userId: string | null, contactId: string | null, name: string, isExternal: boolean }>
  attendees: jsonb("attendees").notNull().default([]),
  summary: text("summary"),
  // Array<{ description: string, assignee: string, dueDate: string | null, done: boolean }>
  actionItems: jsonb("action_items").notNull().default([]),
  hearingData: jsonb("hearing_data"),
  createdById: uuid("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Deals table (案件)
export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  inquiryId: uuid("inquiry_id")
    .references(() => inquiries.id),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  title: text("title").notNull(),
  description: text("description"),
  phase: dealPhaseEnum("phase").notNull().default("proposal_prep"),
  estimatedAmount: integer("estimated_amount"),
  estimatedStartDate: timestamp("estimated_start_date"),
  estimatedEndDate: timestamp("estimated_end_date"),
  // ドメインモデルで型制約（"quasi_delegation" | "fixed_price" | "ses"）、DB は text で柔軟性を持たせる
  contractType: text("contract_type"),
  assigneeId: uuid("assignee_id").references(() => users.id),
  technicalLeadId: uuid("technical_lead_id").references(() => users.id),
  estimateRequestId: uuid("estimate_request_id").references(() => requests.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // 楽観ロック: フェーズ遷移で重複更新を防ぐ
  version: integer("version").notNull().default(1),
});

// Deal contacts table (案件ごとの顧客担当者と役割)
export const dealContacts = pgTable(
  "deal_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => clientContacts.id),
    // "key_person" | "decision_maker" | "technical" | "other"
    role: text("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("deal_contacts_deal_contact_unique").on(table.dealId, table.contactId),
  ]
);

// Contracts table (契約)
export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    dealId: uuid("deal_id")
      .notNull()
      .references(() => deals.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    title: text("title").notNull(),
    contractType: text("contract_type"),
    amount: integer("amount").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    paymentTerms: text("payment_terms"),
    renewalType: renewalTypeEnum("renewal_type").notNull().default("one_time"),
    renewalCycle: text("renewal_cycle"),
    status: contractStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
);

// Invoices table (請求)
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  contractId: uuid("contract_id")
    .notNull()
    .references(() => contracts.id),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  issueDate: timestamp("issue_date"),
  dueDate: timestamp("due_date").notNull(),
  status: invoiceStatusEnum("status").notNull().default("scheduled"),
  invoicedAt: timestamp("invoiced_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Auth.js adapter tables
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// Relations
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  requests: many(requests),
  auditLogs: many(auditLogs),
  approvalSteps: many(approvalSteps),
  approvalTemplates: many(approvalTemplates),
  webhookEndpoints: many(webhookEndpoints),
  idempotencyKeys: many(idempotencyKeys),
  approvalDelegations: many(approvalDelegations),
  clients: many(clients),
  inquiries: many(inquiries),
  meetings: many(meetings),
  deals: many(deals),
  dealContacts: many(dealContacts),
  contracts: many(contracts),
  invoices: many(invoices),
}));

export const idempotencyKeysRelations = relations(idempotencyKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [idempotencyKeys.organizationId],
    references: [organizations.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  requests: many(requests),
  auditLogs: many(auditLogs),
  accounts: many(accounts),
  sessions: many(sessions),
  delegationsFrom: many(approvalDelegations, { relationName: "delegationsFrom" }),
  delegationsTo: many(approvalDelegations, { relationName: "delegationsTo" }),
  inquiries: many(inquiries),
  meetings: many(meetings),
  dealsAsAssignee: many(deals, { relationName: "dealsAsAssignee" }),
  dealsAsTechnicalLead: many(deals, { relationName: "dealsAsTechnicalLead" }),
}));

export const requestsRelations = relations(requests, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [requests.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [requests.creatorId],
    references: [users.id],
  }),
  template: one(approvalTemplates, {
    fields: [requests.templateId],
    references: [approvalTemplates.id],
  }),
  approvalSteps: many(approvalSteps),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const approvalStepsRelations = relations(approvalSteps, ({ one }) => ({
  request: one(requests, {
    fields: [approvalSteps.requestId],
    references: [requests.id],
  }),
  approver: one(users, {
    fields: [approvalSteps.approvedBy],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [approvalSteps.organizationId],
    references: [organizations.id],
  }),
}));

export const approvalTemplatesRelations = relations(
  approvalTemplates,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [approvalTemplates.organizationId],
      references: [organizations.id],
    }),
  })
);

export const webhookEndpointsRelations = relations(
  webhookEndpoints,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [webhookEndpoints.organizationId],
      references: [organizations.id],
    }),
    deliveries: many(webhookDeliveries),
  })
);

export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    endpoint: one(webhookEndpoints, {
      fields: [webhookDeliveries.endpointId],
      references: [webhookEndpoints.id],
    }),
  })
);

export const approvalDelegationsRelations = relations(
  approvalDelegations,
  ({ one }) => ({
    fromUser: one(users, {
      fields: [approvalDelegations.fromUserId],
      references: [users.id],
      relationName: "delegationsFrom",
    }),
    toUser: one(users, {
      fields: [approvalDelegations.toUserId],
      references: [users.id],
      relationName: "delegationsTo",
    }),
    organization: one(organizations, {
      fields: [approvalDelegations.organizationId],
      references: [organizations.id],
    }),
  })
);

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  contacts: many(clientContacts),
  inquiries: many(inquiries),
  contracts: many(contracts),
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, {
    fields: [clientContacts.clientId],
    references: [clients.id],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inquiries.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [inquiries.clientId],
    references: [clients.id],
  }),
  assignee: one(users, {
    fields: [inquiries.assigneeId],
    references: [users.id],
  }),
  deals: many(deals),
  meetings: many(meetings),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  organization: one(organizations, {
    fields: [meetings.organizationId],
    references: [organizations.id],
  }),
  deal: one(deals, {
    fields: [meetings.dealId],
    references: [deals.id],
  }),
  inquiry: one(inquiries, {
    fields: [meetings.inquiryId],
    references: [inquiries.id],
  }),
  createdBy: one(users, {
    fields: [meetings.createdById],
    references: [users.id],
  }),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.organizationId],
    references: [organizations.id],
  }),
  inquiry: one(inquiries, {
    fields: [deals.inquiryId],
    references: [inquiries.id],
  }),
  assignee: one(users, {
    fields: [deals.assigneeId],
    references: [users.id],
    relationName: "dealsAsAssignee",
  }),
  technicalLead: one(users, {
    fields: [deals.technicalLeadId],
    references: [users.id],
    relationName: "dealsAsTechnicalLead",
  }),
  estimateRequest: one(requests, {
    fields: [deals.estimateRequestId],
    references: [requests.id],
  }),
  meetings: many(meetings),
  dealContacts: many(dealContacts),
  contracts: many(contracts),
}));

export const dealContactsRelations = relations(dealContacts, ({ one }) => ({
  deal: one(deals, {
    fields: [dealContacts.dealId],
    references: [deals.id],
  }),
  contact: one(clientContacts, {
    fields: [dealContacts.contactId],
    references: [clientContacts.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contracts.organizationId],
    references: [organizations.id],
  }),
  deal: one(deals, {
    fields: [contracts.dealId],
    references: [deals.id],
  }),
  client: one(clients, {
    fields: [contracts.clientId],
    references: [clients.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  contract: one(contracts, {
    fields: [invoices.contractId],
    references: [contracts.id],
  }),
}));
