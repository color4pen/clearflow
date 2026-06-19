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
  approvalDelegations,
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
  await db.delete(approvalDelegations);
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
  // 経費申請テンプレート
  const [expenseTemplate] = await db
    .insert(approvalTemplates)
    .values({
      name: "経費申請",
      organizationId: org.id,
      fields: [
        { name: "amount", label: "金額", type: "number", required: true },
        { name: "purpose", label: "用途", type: "text", required: true },
        { name: "vendor", label: "支払先", type: "text", required: false },
      ],
      steps: [
        { stepOrder: 1, approverRole: "manager" },
        { stepOrder: 2, approverRole: "finance", deadlineHours: 72, condition: { field: "amount", operator: "gt", value: 100000 } },
      ],
    })
    .returning();
  console.log(`✅ Created template: ${expenseTemplate.name}`);

  // 購買申請テンプレート
  const [purchaseTemplate] = await db
    .insert(approvalTemplates)
    .values({
      name: "購買申請",
      organizationId: org.id,
      fields: [
        { name: "amount", label: "金額", type: "number", required: true },
        { name: "item", label: "品名", type: "text", required: true },
        { name: "quantity", label: "数量", type: "number", required: true },
        { name: "deliveryDate", label: "納期", type: "date", required: false },
      ],
      steps: [
        { stepOrder: 1, approverRole: "manager" },
        { stepOrder: 2, approverRole: "finance", deadlineHours: 72, condition: { field: "amount", operator: "gt", value: 100000 } },
      ],
    })
    .returning();
  console.log(`✅ Created template: ${purchaseTemplate.name}`);

  // 休暇申請テンプレート
  const [leaveTemplate] = await db
    .insert(approvalTemplates)
    .values({
      name: "休暇申請",
      organizationId: org.id,
      fields: [
        { name: "startDate", label: "開始日", type: "date", required: true },
        { name: "endDate", label: "終了日", type: "date", required: true },
        { name: "reason", label: "理由", type: "textarea", required: false },
      ],
      steps: [
        { stepOrder: 1, approverRole: "manager" },
      ],
    })
    .returning();
  console.log(`✅ Created template: ${leaveTemplate.name}`);

  // Create requests in various statuses
  const [draftRequest] = await db
    .insert(requests)
    .values({
      title: "備品購入申請",
      formData: {
        amount: { value: 50000, label: "金額" },
        purpose: { value: "オフィス用の椅子を5脚購入したい", label: "用途" },
        vendor: { value: "オフィス家具店", label: "支払先" },
      },
      templateId: expenseTemplate.id,
      status: "draft",
      organizationId: org.id,
      creatorId: memberUser.id,
    })
    .returning();
  console.log(`✅ Created draft request: ${draftRequest.title}`);

  const [pendingRequest] = await db
    .insert(requests)
    .values({
      title: "出張申請 - 東京オフィス訪問",
      formData: {
        amount: { value: 150000, label: "金額" },
        purpose: { value: "来週月曜日に東京オフィスへの出張", label: "用途" },
      },
      templateId: expenseTemplate.id,
      status: "pending",
      organizationId: org.id,
      creatorId: memberUser.id,
    })
    .returning();
  console.log(`✅ Created pending request: ${pendingRequest.title}`);

  const [approvedRequest] = await db
    .insert(requests)
    .values({
      title: "ソフトウェアライセンス購入",
      formData: {
        amount: { value: 30000, label: "金額" },
        purpose: { value: "開発ツールのライセンスを購入", label: "用途" },
      },
      templateId: expenseTemplate.id,
      status: "approved",
      organizationId: org.id,
      creatorId: memberUser.id,
    })
    .returning();
  console.log(`✅ Created approved request: ${approvedRequest.title}`);

  // Add approval steps for the pending request (manager -> finance due to amount > 100000)
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
        templateId: expenseTemplate.id,
        templateName: expenseTemplate.name,
      },
    },
    {
      action: "request.create",
      targetType: "request",
      targetId: pendingRequest.id,
      actorId: memberUser.id,
      organizationId: org.id,
      metadata: {
        templateId: expenseTemplate.id,
        templateName: expenseTemplate.name,
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
        templateId: expenseTemplate.id,
        templateName: expenseTemplate.name,
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

  // Create sample approval delegation: manager → admin
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);

  await db.insert(approvalDelegations).values({
    fromUserId: managerUser.id,
    toUserId: adminUser.id,
    organizationId: org.id,
    startDate: today,
    endDate: sevenDaysLater,
    isActive: true,
  });
  console.log(`✅ Created approval delegation: manager → admin (${today.toISOString().slice(0, 10)} ～ ${sevenDaysLater.toISOString().slice(0, 10)})`);

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
