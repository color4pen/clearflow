import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  organizations,
  users,
  requests,
  auditLogs,
  accounts,
  sessions,
  verificationTokens,
  approvalSteps,
  approvalTemplates,
  webhookEndpoints,
  webhookDeliveries,
} from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function seed() {
  console.log("🌱 Seeding database...");

  // Truncate all tables (order matters for FK constraints)
  await db.delete(auditLogs);
  await db.delete(approvalSteps);
  await db.delete(requests);
  await db.delete(approvalTemplates);
  await db.delete(accounts);
  await db.delete(sessions);
  await db.delete(verificationTokens);
  await db.delete(webhookDeliveries);
  await db.delete(webhookEndpoints);
  await db.delete(users);
  await db.delete(organizations);

  console.log("✅ Cleared existing data");

  // Create organization
  const [org] = await db
    .insert(organizations)
    .values({ name: "Acme Corp" })
    .returning();
  console.log(`✅ Created organization: ${org.name} (${org.id})`);

  // Hash passwords
  const hashedPassword = await bcrypt.hash("password123", 12);

  // Create admin user
  const [adminUser] = await db
    .insert(users)
    .values({
      email: "admin@example.com",
      hashedPassword,
      name: "Admin User",
      organizationId: org.id,
      role: "admin",
    })
    .returning();
  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create member user
  const [memberUser] = await db
    .insert(users)
    .values({
      email: "member@example.com",
      hashedPassword,
      name: "Member User",
      organizationId: org.id,
      role: "member",
    })
    .returning();
  console.log(`✅ Created member user: ${memberUser.email}`);

  // Create manager user
  const [managerUser] = await db
    .insert(users)
    .values({
      email: "manager@example.com",
      hashedPassword,
      name: "Manager User",
      organizationId: org.id,
      role: "manager",
    })
    .returning();
  console.log(`✅ Created manager user: ${managerUser.email}`);

  // Create finance user
  const [financeUser] = await db
    .insert(users)
    .values({
      email: "finance@example.com",
      hashedPassword,
      name: "Finance User",
      organizationId: org.id,
      role: "finance",
    })
    .returning();
  console.log(`✅ Created finance user: ${financeUser.email}`);

  // Create system user (fixed UUID for SYSTEM_USER_ID)
  const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
  await db
    .insert(users)
    .values({
      id: SYSTEM_USER_ID,
      email: "system@clearflow.internal",
      hashedPassword: await bcrypt.hash(crypto.randomUUID(), 12),
      name: "System",
      organizationId: org.id,
      role: "member",
    })
    .onConflictDoNothing();
  console.log(`✅ Created system user: system@clearflow.internal (${SYSTEM_USER_ID})`);

  // Create approval templates
  // Default template: no amount condition, single manager approval step
  const [defaultTemplate] = await db
    .insert(approvalTemplates)
    .values({
      name: "デフォルト（上長承認）",
      organizationId: org.id,
      steps: [{ stepOrder: 1, approverRole: "manager" }],
      minAmount: null,
      maxAmount: null,
    })
    .returning();
  console.log(`✅ Created template: ${defaultTemplate.name}`);

  // Small amount template: up to 100,000 yen, single manager approval
  const [smallTemplate] = await db
    .insert(approvalTemplates)
    .values({
      name: "少額申請（上長承認）",
      organizationId: org.id,
      steps: [{ stepOrder: 1, approverRole: "manager" }],
      minAmount: null,
      maxAmount: 100000,
    })
    .returning();
  console.log(`✅ Created template: ${smallTemplate.name}`);

  // Large amount template: over 100,000 yen, manager then finance approval
  const [largeTemplate] = await db
    .insert(approvalTemplates)
    .values({
      name: "高額申請（上長→経理承認）",
      organizationId: org.id,
      steps: [
        { stepOrder: 1, approverRole: "manager", deadlineHours: 72 },
        { stepOrder: 2, approverRole: "finance", deadlineHours: 72 },
      ],
      minAmount: 100001,
      maxAmount: null,
    })
    .returning();
  console.log(`✅ Created template: ${largeTemplate.name}`);

  // Create requests in various statuses
  const [draftRequest] = await db
    .insert(requests)
    .values({
      title: "備品購入申請",
      description: "オフィス用の椅子を5脚購入したい",
      status: "draft",
      amount: 50000,
      organizationId: org.id,
      creatorId: memberUser.id,
    })
    .returning();
  console.log(`✅ Created draft request: ${draftRequest.title}`);

  const [pendingRequest] = await db
    .insert(requests)
    .values({
      title: "出張申請 - 東京オフィス訪問",
      description: "来週月曜日に東京オフィスへの出張を申請します",
      status: "pending",
      amount: 150000,
      organizationId: org.id,
      creatorId: memberUser.id,
    })
    .returning();
  console.log(`✅ Created pending request: ${pendingRequest.title}`);

  const [approvedRequest] = await db
    .insert(requests)
    .values({
      title: "ソフトウェアライセンス購入",
      description: "開発ツールのライセンスを購入したい",
      status: "approved",
      amount: 30000,
      organizationId: org.id,
      creatorId: memberUser.id,
    })
    .returning();
  console.log(`✅ Created approved request: ${approvedRequest.title}`);

  // Add approval steps for the pending request (using large template: manager -> finance)
  const [pendingStep] = await db
    .insert(approvalSteps)
    .values({
      requestId: pendingRequest.id,
      stepOrder: 1,
      approverRole: "manager",
      status: "pending",
      organizationId: org.id,
    })
    .returning();
  console.log(
    `✅ Created approval step for pending request: step ${pendingStep.stepOrder}`
  );

  await db.insert(approvalSteps).values({
    requestId: pendingRequest.id,
    stepOrder: 2,
    approverRole: "finance",
    status: "pending",
    organizationId: org.id,
  });

  // Create audit logs for status changes
  await db.insert(auditLogs).values([
    {
      action: "request.create",
      targetType: "request",
      targetId: draftRequest.id,
      actorId: memberUser.id,
      organizationId: org.id,
      metadata: {
        templateId: smallTemplate.id,
        templateName: smallTemplate.name,
        amount: 50000,
      },
    },
    {
      action: "request.create",
      targetType: "request",
      targetId: pendingRequest.id,
      actorId: memberUser.id,
      organizationId: org.id,
      metadata: {
        templateId: largeTemplate.id,
        templateName: largeTemplate.name,
        amount: 150000,
      },
    },
    {
      action: "request.submit",
      targetType: "request",
      targetId: pendingRequest.id,
      actorId: memberUser.id,
      organizationId: org.id,
    },
    {
      action: "request.create",
      targetType: "request",
      targetId: approvedRequest.id,
      actorId: memberUser.id,
      organizationId: org.id,
      metadata: {
        templateId: smallTemplate.id,
        templateName: smallTemplate.name,
        amount: 30000,
      },
    },
    {
      action: "request.submit",
      targetType: "request",
      targetId: approvedRequest.id,
      actorId: memberUser.id,
      organizationId: org.id,
    },
    {
      action: "request.approve",
      targetType: "request",
      targetId: approvedRequest.id,
      actorId: managerUser.id,
      organizationId: org.id,
    },
  ]);
  console.log("✅ Created audit logs");

  // Create webhook endpoint for default organization
  await db.insert(webhookEndpoints).values({
    url: "https://example.com/webhook",
    secret: "whsec_test_secret_for_development",
    isActive: true,
    events: [
      "request.created",
      "request.submitted",
      "request.approved",
      "request.rejected",
      "request.revised",
      "request.resubmitted",
      "step.approved",
      "step.rejected",
    ],
    organizationId: org.id,
  });
  console.log("✅ Created webhook endpoint for default organization");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\nLogin credentials:");
  console.log("  Admin:   admin@example.com / password123");
  console.log("  Member:  member@example.com / password123");
  console.log("  Manager: manager@example.com / password123");
  console.log("  Finance: finance@example.com / password123");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
