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

  // Create approval templates
  const [singleStepTemplate] = await db
    .insert(approvalTemplates)
    .values({
      name: "上長承認のみ",
      organizationId: org.id,
      steps: [{ stepOrder: 1, approverRole: "admin" }],
    })
    .returning();
  console.log(`✅ Created template: ${singleStepTemplate.name}`);

  const [twoStepTemplate] = await db
    .insert(approvalTemplates)
    .values({
      name: "上長承認 → 経理承認",
      organizationId: org.id,
      steps: [
        { stepOrder: 1, approverRole: "admin" },
        { stepOrder: 2, approverRole: "admin" },
      ],
    })
    .returning();
  console.log(`✅ Created template: ${twoStepTemplate.name}`);

  // Create requests in various statuses
  const [draftRequest] = await db
    .insert(requests)
    .values({
      title: "備品購入申請",
      description: "オフィス用の椅子を5脚購入したい",
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
      description: "来週月曜日に東京オフィスへの出張を申請します",
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
      description: "開発ツールのライセンスを購入したい",
      status: "approved",
      organizationId: org.id,
      creatorId: memberUser.id,
    })
    .returning();
  console.log(`✅ Created approved request: ${approvedRequest.title}`);

  // Add approval steps for the pending request (using single-step template)
  const [pendingStep] = await db
    .insert(approvalSteps)
    .values({
      requestId: pendingRequest.id,
      stepOrder: 1,
      approverRole: "admin",
      status: "pending",
      organizationId: org.id,
    })
    .returning();
  console.log(
    `✅ Created approval step for pending request: step ${pendingStep.stepOrder}`
  );

  // Create audit logs for status changes
  await db.insert(auditLogs).values([
    {
      action: "request.create",
      targetType: "request",
      targetId: draftRequest.id,
      actorId: memberUser.id,
      organizationId: org.id,
    },
    {
      action: "request.create",
      targetType: "request",
      targetId: pendingRequest.id,
      actorId: memberUser.id,
      organizationId: org.id,
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
      actorId: adminUser.id,
      organizationId: org.id,
    },
  ]);
  console.log("✅ Created audit logs");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\nLogin credentials:");
  console.log("  Admin: admin@example.com / password123");
  console.log("  Member: member@example.com / password123");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
