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
  approvalPolicies,
  webhookEndpoints,
  webhookDeliveries,
  approvalDelegations,
  clients,
  clientContacts,
  inquiries,
  interactions,
  deals,
  dealContacts,
  contracts,
  invoices,
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
  // deal_contacts must be deleted before deals
  await db.delete(dealContacts);
  // invoices must be deleted before contracts (FK: contractId)
  await db.delete(invoices);
  // contracts must be deleted before deals (FK: dealId)
  await db.delete(contracts);
  // interactions.dealId FK: interactions must be deleted before deals
  await db.delete(interactions);
  // deals.inquiryId FK: deals must be deleted before inquiries
  await db.delete(deals);
  await db.delete(inquiries);
  await db.delete(clientContacts);
  await db.delete(clients);
  await db.delete(requests);
  await db.delete(approvalPolicies);
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

  // Create sample approval policy
  await db.insert(approvalPolicies).values({
    name: "案件フェーズ変更時の承認",
    organizationId: org.id,
    triggerAction: "deal.phase_change",
    templateId: expenseTemplate.id,
    isActive: true,
  });
  console.log("✅ Created sample approval policy");

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
    fromUserRole: "manager",
  });
  console.log(`✅ Created approval delegation: manager → admin (${today.toISOString().slice(0, 10)} ～ ${sevenDaysLater.toISOString().slice(0, 10)})`);

  // Create sample clients (5社)
  const [techClient] = await db
    .insert(clients)
    .values({
      name: "株式会社テック商事",
      organizationId: org.id,
      industry: "IT・ソフトウェア",
      size: "中堅",
      address: "東京都千代田区丸の内1-1-1",
    })
    .returning();

  const [yamato] = await db
    .insert(clients)
    .values({
      name: "大和建設株式会社",
      organizationId: org.id,
      industry: "建設業",
      size: "大手",
      address: "大阪府大阪市北区梅田2-2-2",
    })
    .returning();

  const [sakuraLogistics] = await db
    .insert(clients)
    .values({
      name: "さくら物流株式会社",
      organizationId: org.id,
      industry: "物流・運輸",
      size: "中小",
      address: "愛知県名古屋市中村区3-3-3",
    })
    .returning();

  const [greenEnergy] = await db
    .insert(clients)
    .values({
      name: "グリーンエナジー合同会社",
      organizationId: org.id,
      industry: "エネルギー",
      size: "スタートアップ",
    })
    .returning();

  const [nihonFinance] = await db
    .insert(clients)
    .values({
      name: "日本ファイナンス株式会社",
      organizationId: org.id,
      industry: "金融・保険",
      size: "大手",
      address: "東京都中央区日本橋5-5-5",
    })
    .returning();
  console.log(`✅ Created clients (5 total)`);

  // Create client contacts (2-3 per client)
  const [techContact1] = await db
    .insert(clientContacts)
    .values({
      clientId: techClient.id,
      name: "山田 太郎",
      department: "営業部",
      position: "部長",
      email: "yamada@tech-shoji.example.com",
      phone: "03-1111-0001",
      isPrimary: true,
    })
    .returning();

  const [techContact2] = await db
    .insert(clientContacts)
    .values({
      clientId: techClient.id,
      name: "鈴木 花子",
      department: "企画部",
      position: "主任",
      email: "suzuki@tech-shoji.example.com",
      phone: "03-1111-0002",
      isPrimary: false,
    })
    .returning();

  const [yamatoContact1] = await db
    .insert(clientContacts)
    .values({
      clientId: yamato.id,
      name: "田中 一郎",
      department: "調達部",
      position: "課長",
      email: "tanaka@yamato-kensetu.example.com",
      phone: "06-2222-0001",
      isPrimary: true,
    })
    .returning();

  const [yamatoContact2] = await db
    .insert(clientContacts)
    .values({
      clientId: yamato.id,
      name: "佐藤 次郎",
      department: "総務部",
      position: "担当",
      email: "sato@yamato-kensetu.example.com",
      phone: "06-2222-0002",
      isPrimary: false,
    })
    .returning();

  const [sakuraContact1] = await db
    .insert(clientContacts)
    .values({
      clientId: sakuraLogistics.id,
      name: "高橋 美咲",
      department: "情報システム部",
      position: "部長",
      email: "takahashi@sakura-logistics.example.com",
      phone: "052-3333-0001",
      isPrimary: true,
    })
    .returning();

  const [sakuraContact2] = await db
    .insert(clientContacts)
    .values({
      clientId: sakuraLogistics.id,
      name: "中村 健太",
      department: "情報システム部",
      position: "主任",
      email: "nakamura@sakura-logistics.example.com",
      phone: "052-3333-0002",
      isPrimary: false,
    })
    .returning();

  await db
    .insert(clientContacts)
    .values({
      clientId: greenEnergy.id,
      name: "木村 翔太",
      department: null,
      position: "CEO",
      email: "kimura@green-energy.example.com",
      phone: "080-4444-0001",
      isPrimary: true,
    })
    .returning();

  const [financeContact1] = await db
    .insert(clientContacts)
    .values({
      clientId: nihonFinance.id,
      name: "渡辺 浩二",
      department: "IT戦略部",
      position: "次長",
      email: "watanabe@nihon-finance.example.com",
      phone: "03-5555-0001",
      isPrimary: true,
    })
    .returning();

  const [financeContact2] = await db
    .insert(clientContacts)
    .values({
      clientId: nihonFinance.id,
      name: "伊藤 恵",
      department: "IT戦略部",
      position: "課長",
      email: "ito@nihon-finance.example.com",
      phone: "03-5555-0002",
      isPrimary: false,
    })
    .returning();
  console.log("✅ Created client contacts (9 total)");

  // Create inquiries (各ステータスを網羅: new×2, in_progress×2, converted×2, declined×1)
  await db.insert(inquiries).values({
    organizationId: org.id,
    clientId: techClient.id,
    title: "基幹システム刷新に関する問い合わせ",
    description: "現行システムの老朽化に伴い、クラウド移行を検討中",
    source: "web",
    status: "new",
  }).returning();

  await db.insert(inquiries).values({
    organizationId: org.id,
    title: "配送管理システムの相談",
    description: "展示会ブースで名刺交換。配送ルート最適化に興味",
    source: "exhibition",
    status: "new",
  }).returning();

  await db.insert(inquiries).values({
    organizationId: org.id,
    clientId: yamato.id,
    title: "工事管理ツールの導入検討",
    description: "工事進捗の可視化と承認フロー整備が課題",
    source: "phone",
    status: "new",
    assigneeId: managerUser.id,
  }).returning();

  await db.insert(inquiries).values({
    organizationId: org.id,
    clientId: nihonFinance.id,
    title: "リスク管理ダッシュボード構築",
    description: "ポートフォリオのリスク指標をリアルタイム可視化したい",
    source: "referral",
    status: "new",
    assigneeId: adminUser.id,
  }).returning();

  const [convertedInquiry1] = await db.insert(inquiries).values({
    organizationId: org.id,
    clientId: yamato.id,
    title: "工事管理ツール案件化",
    description: "提案・交渉を経て案件化",
    source: "phone",
    status: "converted",
    assigneeId: managerUser.id,
  }).returning();

  const [convertedInquiry2] = await db.insert(inquiries).values({
    organizationId: org.id,
    clientId: techClient.id,
    title: "DX推進プロジェクト受注",
    description: "昨期より継続商談。正式受注に向けて承認済み",
    source: "referral",
    status: "converted",
  }).returning();

  const [convertedInquiry3] = await db.insert(inquiries).values({
    organizationId: org.id,
    clientId: sakuraLogistics.id,
    title: "配送ルート最適化システム",
    description: "配送コスト削減のためルート最適化を検討。案件化済み",
    source: "exhibition",
    status: "converted",
    assigneeId: adminUser.id,
  }).returning();

  const [convertedInquiry4] = await db.insert(inquiries).values({
    organizationId: org.id,
    clientId: nihonFinance.id,
    title: "リスク管理ダッシュボード案件化",
    description: "ヒアリングを経て案件化。提案準備中",
    source: "referral",
    status: "converted",
    assigneeId: adminUser.id,
  }).returning();

  const [convertedInquiry5] = await db.insert(inquiries).values({
    organizationId: org.id,
    clientId: greenEnergy.id,
    title: "発電量モニタリングシステム",
    description: "IoTセンサーデータの収集・可視化。交渉中だったが失注",
    source: "phone",
    status: "converted",
  }).returning();

  await db.insert(inquiries).values({
    organizationId: org.id,
    clientId: greenEnergy.id,
    title: "発電量予測AIの共同研究",
    description: "太陽光発電の発電量をAIで予測したいとの相談。技術的に見送り",
    source: "web",
    status: "declined",
  });
  console.log("✅ Created inquiries (10 total: new×4, converted×5, declined×1)");


  // Create deals (各フェーズを網羅)
  const [wonDeal] = await db.insert(deals).values({
    organizationId: org.id,
    inquiryId: convertedInquiry2.id,
    clientId: techClient.id,
    title: "DX推進プロジェクト",
    phase: "won",
    estimatedAmount: 30000000,
    estimatedStartDate: new Date("2026-07-01"),
    estimatedEndDate: new Date("2027-03-31"),
    contractType: "quasi_delegation",
    assigneeId: managerUser.id,
    technicalLeadId: memberUser.id,
    notes: "9ヶ月のプロジェクト。フェーズ1（要件定義・設計）3ヶ月、フェーズ2（開発・テスト）6ヶ月",
  }).returning();

  const [wonDeal2] = await db.insert(deals).values({
    organizationId: org.id,
    inquiryId: convertedInquiry1.id,
    clientId: yamato.id,
    title: "工事管理ツール導入",
    phase: "won",
    estimatedAmount: 15000000,
    estimatedStartDate: new Date("2026-09-01"),
    estimatedEndDate: new Date("2027-02-28"),
    contractType: "fixed_price",
    assigneeId: managerUser.id,
    technicalLeadId: memberUser.id,
  }).returning();

  const [prepDeal] = await db.insert(deals).values({
    organizationId: org.id,
    inquiryId: convertedInquiry4.id,
    clientId: nihonFinance.id,
    title: "リスク管理ダッシュボード",
    phase: "proposal_prep",
    estimatedAmount: 50000000,
    assigneeId: adminUser.id,
    technicalLeadId: memberUser.id,
    notes: "大型案件。セキュリティ要件の調査が必要",
  }).returning();

  const [wonDeal3] = await db.insert(deals).values({
    organizationId: org.id,
    inquiryId: convertedInquiry3.id,
    clientId: sakuraLogistics.id,
    title: "配送ルート最適化システム",
    phase: "won",
    estimatedAmount: 8000000,
    estimatedStartDate: new Date("2026-10-01"),
    estimatedEndDate: new Date("2027-01-31"),
    contractType: "ses",
    assigneeId: adminUser.id,
  }).returning();

  await db.insert(deals).values({
    organizationId: org.id,
    inquiryId: convertedInquiry5.id,
    clientId: greenEnergy.id,
    title: "発電量モニタリングシステム",
    phase: "lost",
    estimatedAmount: 5000000,
    notes: "競合に価格で負けた",
  });

  // 引き合いなし案件（直接作成パターン）
  await db.insert(deals).values({
    organizationId: org.id,
    clientId: techClient.id,
    title: "株式会社テック商事 追加開発案件",
    phase: "proposal_prep",
    estimatedAmount: 3000000,
    notes: "既存顧客からの口頭依頼。引き合いなしで直接案件化",
  });

  // ヒアリングフェーズ案件（初期フェーズのサンプル）
  await db.insert(deals).values({
    organizationId: org.id,
    clientId: yamato.id,
    title: "大和建設 新規DX相談",
    phase: "hearing",
    estimatedAmount: 8000000,
    assigneeId: memberUser.id,
    notes: "初回ヒアリング実施済み。要件整理中",
  });

  // 見送りフェーズ案件（終端・当社都合で見送り）
  await db.insert(deals).values({
    organizationId: org.id,
    clientId: nihonFinance.id,
    title: "日本ファイナンス 小規模改善案件",
    phase: "passed",
    estimatedAmount: 1500000,
    notes: "ヒアリング後、採算が合わないと判断し見送り",
  });
  console.log("✅ Created deals (8 total: hearing×1, proposal_prep×2, won×3, lost×1, passed×1)");

  // Create deal meetings (案件直紐づきの商談)
  await db.insert(interactions).values({
    organizationId: org.id,
    kind: "meeting",
    dealId: wonDeal2.id,
    meetingType: "proposal",
    date: new Date("2026-06-20T14:00:00"),
    location: "大和建設株式会社 会議室",
    attendees: [
      { userId: managerUser.id, name: managerUser.name, isExternal: false },
      { userId: memberUser.id, name: memberUser.name, isExternal: false },
      { name: "田中 一郎", isExternal: true },
    ],
    summary: "案件化後の提案会議。詳細スコープと費用感を確認した。",
    actionItems: [
      { description: "詳細見積書を作成する", assignee: managerUser.name, dueDate: "2026-07-05", done: false },
      { description: "技術要件を整理する", assignee: memberUser.name, dueDate: "2026-07-05", done: false },
    ],
    details: null,
    createdById: managerUser.id,
  });

  await db.insert(interactions).values({
    organizationId: org.id,
    kind: "meeting",
    dealId: wonDeal.id,
    meetingType: "closing",
    date: new Date("2026-06-10T10:00:00"),
    location: "株式会社テック商事 応接室",
    attendees: [
      { userId: adminUser.id, name: adminUser.name, isExternal: false },
      { userId: managerUser.id, name: managerUser.name, isExternal: false },
      { name: "山田 太郎", isExternal: true },
      { name: "鈴木 花子", isExternal: true },
    ],
    summary: "契約条件の最終確認。準委任契約で合意。7月1日キックオフ予定。",
    actionItems: [
      { description: "契約書のドラフトを送付する", assignee: adminUser.name, dueDate: "2026-06-15", done: true },
      { description: "プロジェクト体制図を作成する", assignee: managerUser.name, dueDate: "2026-06-25", done: true },
    ],
    details: null,
    createdById: adminUser.id,
  });

  await db.insert(interactions).values({
    organizationId: org.id,
    kind: "meeting",
    dealId: wonDeal.id,
    meetingType: "followup",
    date: new Date("2026-06-28T14:00:00"),
    location: "オンライン（Zoom）",
    attendees: [
      { userId: managerUser.id, name: managerUser.name, isExternal: false },
      { userId: memberUser.id, name: memberUser.name, isExternal: false },
      { name: "山田 太郎", isExternal: true },
    ],
    summary: "キックオフ前の最終打ち合わせ。開発環境のセットアップ手順を共有。",
    actionItems: [
      { description: "VPN接続情報を提供する", assignee: "山田 太郎", dueDate: "2026-06-30", done: false },
    ],
    details: null,
    createdById: managerUser.id,
  });
  console.log("✅ Created deal meetings (initial 3)");

  // Create deal meetings for new deals
  await db.insert(interactions).values({
    organizationId: org.id,
    kind: "meeting",
    dealId: wonDeal3.id,
    meetingType: "negotiation",
    date: new Date("2026-07-10T13:00:00"),
    location: "さくら物流株式会社 本社",
    attendees: [
      { userId: adminUser.id, name: adminUser.name, isExternal: false },
      { name: "高橋 美咲", isExternal: true },
      { name: "中村 健太", isExternal: true },
    ],
    summary: "配送ルート最適化の価格交渉。SES契約での提案を検討中。",
    actionItems: [
      { description: "SES単価の最終提示", assignee: adminUser.name, dueDate: "2026-07-15", done: false },
    ],
    details: null,
    createdById: adminUser.id,
  });
  // 案件フェーズ前の商談（inquiryId 廃止により対応する案件に紐づけ直し）
  await db.insert(interactions).values({
    organizationId: org.id,
    kind: "meeting",
    dealId: wonDeal2.id,
    meetingType: "hearing",
    date: new Date("2026-04-15T10:00:00"),
    location: "大和建設株式会社 第1会議室",
    attendees: [
      { userId: managerUser.id, name: managerUser.name, isExternal: false },
      { name: "田中 一郎", isExternal: true },
    ],
    summary: "初回ヒアリング。工事進捗管理の現状課題をヒアリングした。",
    actionItems: [
      { description: "他社事例をまとめて次回提示する", assignee: managerUser.name, dueDate: "2026-04-30", done: true },
    ],
    details: {
      challenge: "工事進捗の可視化と承認フロー整備が課題",
      budget: "1500万円〜2000万円",
      decisionMaker: "取締役 工事本部長",
      timeline: "今期中（2026年度内）",
      competitors: "現状なし",
      notes: "既存のExcel管理から脱却したい",
    },
    createdById: managerUser.id,
  });

  await db.insert(interactions).values({
    organizationId: org.id,
    kind: "meeting",
    dealId: wonDeal2.id,
    meetingType: "proposal",
    date: new Date("2026-05-20T10:00:00"),
    location: "大和建設株式会社 第2会議室",
    attendees: [
      { userId: managerUser.id, name: managerUser.name, isExternal: false },
      { userId: memberUser.id, name: memberUser.name, isExternal: false },
      { name: "田中 一郎", isExternal: true },
      { name: "佐藤 次郎", isExternal: true },
    ],
    summary: "工事管理ツールの提案書を提示。承認フロー機能を中心にデモを実施した。",
    actionItems: [
      { description: "カスタマイズ要件をまとめた提案書改訂版を提出する", assignee: managerUser.name, dueDate: "2026-06-05", done: false },
    ],
    details: null,
    createdById: managerUser.id,
  });

  await db.insert(interactions).values({
    organizationId: org.id,
    kind: "meeting",
    dealId: prepDeal.id,
    meetingType: "hearing",
    date: new Date("2026-05-25T15:00:00"),
    location: "オンライン（Teams）",
    attendees: [
      { userId: adminUser.id, name: adminUser.name, isExternal: false },
      { userId: memberUser.id, name: memberUser.name, isExternal: false },
      { name: "渡辺 浩二", isExternal: true },
      { name: "伊藤 恵", isExternal: true },
    ],
    summary: "リスク管理ダッシュボードの要件ヒアリング。リアルタイム性と可視化の粒度を確認。",
    actionItems: [
      { description: "技術検証の結果レポートを提出する", assignee: memberUser.name, dueDate: "2026-06-08", done: false },
      { description: "概算見積を作成する", assignee: adminUser.name, dueDate: "2026-06-15", done: false },
    ],
    details: {
      challenge: "リスク指標のリアルタイム監視ができていない",
      budget: "5000万円〜1億円",
      decisionMaker: "CTO",
      timeline: "来期（2027年4月〜）",
      competitors: "外資系コンサル1社が提案中",
      notes: "セキュリティ要件が厳格。オンプレミス or プライベートクラウドが条件",
    },
    createdById: adminUser.id,
  });

  await db.insert(interactions).values({
    organizationId: org.id,
    kind: "meeting",
    dealId: wonDeal.id,
    meetingType: "followup",
    date: new Date("2026-06-15T11:00:00"),
    location: "株式会社テック商事 本社",
    attendees: [
      { userId: adminUser.id, name: adminUser.name, isExternal: false },
      { name: "山田 太郎", isExternal: true },
    ],
    summary: "受注後のフォローアップ訪問。プロジェクト開始スケジュールを確認した。",
    actionItems: [
      { description: "キックオフ会議の日程を調整する", assignee: adminUser.name, dueDate: "2026-06-20", done: false },
    ],
    details: null,
    createdById: adminUser.id,
  });
  console.log("✅ Created deal meetings (8 total)");

  // Create deal contacts
  await db.insert(dealContacts).values([
    { dealId: wonDeal.id, contactId: techContact1.id, role: "key_person" },
    { dealId: wonDeal.id, contactId: techContact2.id, role: "technical" },
    { dealId: wonDeal2.id, contactId: yamatoContact1.id, role: "decision_maker" },
    { dealId: wonDeal2.id, contactId: yamatoContact2.id, role: "other" },
    { dealId: prepDeal.id, contactId: financeContact1.id, role: "key_person" },
    { dealId: prepDeal.id, contactId: financeContact2.id, role: "technical" },
    { dealId: wonDeal3.id, contactId: sakuraContact1.id, role: "decision_maker" },
    { dealId: wonDeal3.id, contactId: sakuraContact2.id, role: "technical" },
  ]);
  console.log("✅ Created deal contacts (8 total)");

  // Create contract for won deal (DX推進プロジェクト)
  const [dxContract] = await db.insert(contracts).values({
    organizationId: org.id,
    dealId: wonDeal.id,
    clientId: techClient.id,
    title: "DX推進プロジェクト",
    contractType: "quasi_delegation",
    amount: 30000000,
    startDate: new Date("2026-07-01"),
    endDate: new Date("2027-03-31"),
    renewalType: "one_time",
    status: "active",
  }).returning();
  console.log("✅ Created contract for won deal (DX推進プロジェクト)");

  // Create invoices for DX推進プロジェクト contract (total: 30,000,000)
  await db.insert(invoices).values([
    {
      organizationId: org.id,
      contractId: dxContract.id,
      title: "着手金",
      amount: 9000000,
      dueDate: new Date("2026-07-31"),
      status: "paid",
      invoicedAt: new Date("2026-07-10"),
      paidAt: new Date("2026-07-31"),
    },
    {
      organizationId: org.id,
      contractId: dxContract.id,
      title: "中間金",
      amount: 9000000,
      dueDate: new Date("2026-10-31"),
      status: "invoiced",
      invoicedAt: new Date("2026-10-01"),
    },
    {
      organizationId: org.id,
      contractId: dxContract.id,
      title: "残金",
      amount: 12000000,
      dueDate: new Date("2027-03-31"),
      status: "scheduled",
    },
  ]);
  console.log("✅ Created invoices for DX推進プロジェクト contract (3 total)");

  // Contract for 工事管理ツール導入 (請負・one_time)
  const [constructionContract] = await db.insert(contracts).values({
    organizationId: org.id,
    dealId: wonDeal2.id,
    clientId: yamato.id,
    title: "工事管理ツール導入",
    contractType: "fixed_price",
    amount: 15000000,
    startDate: new Date("2026-09-01"),
    endDate: new Date("2027-02-28"),
    paymentTerms: "月末締め翌月末払い",
    renewalType: "one_time",
    status: "active",
  }).returning();

  await db.insert(invoices).values([
    {
      organizationId: org.id,
      contractId: constructionContract.id,
      title: "着手金（30%）",
      amount: 4500000,
      dueDate: new Date("2026-09-30"),
      status: "paid",
      invoicedAt: new Date("2026-09-05"),
      paidAt: new Date("2026-09-25"),
    },
    {
      organizationId: org.id,
      contractId: constructionContract.id,
      title: "中間金（30%）",
      amount: 4500000,
      dueDate: new Date("2026-12-31"),
      status: "scheduled",
    },
    {
      organizationId: org.id,
      contractId: constructionContract.id,
      title: "納品時残金（40%）",
      amount: 6000000,
      dueDate: new Date("2027-03-31"),
      status: "scheduled",
    },
  ]);
  console.log("✅ Created contract + invoices for 工事管理ツール導入 (3 invoices)");

  // Contract for 配送ルート最適化システム (SES・recurring)
  const [logisticsContract] = await db.insert(contracts).values({
    organizationId: org.id,
    dealId: wonDeal3.id,
    clientId: sakuraLogistics.id,
    title: "配送ルート最適化 SES契約",
    contractType: "ses",
    amount: 800000,
    startDate: new Date("2026-10-01"),
    endDate: new Date("2027-03-31"),
    paymentTerms: "月末締め翌月末払い",
    renewalType: "recurring",
    renewalCycle: "monthly",
    status: "active",
  }).returning();

  await db.insert(invoices).values([
    {
      organizationId: org.id,
      contractId: logisticsContract.id,
      title: "2026年10月分稼働",
      amount: 800000,
      dueDate: new Date("2026-11-30"),
      status: "paid",
      invoicedAt: new Date("2026-11-01"),
      paidAt: new Date("2026-11-28"),
    },
    {
      organizationId: org.id,
      contractId: logisticsContract.id,
      title: "2026年11月分稼働",
      amount: 800000,
      dueDate: new Date("2026-12-31"),
      status: "invoiced",
      invoicedAt: new Date("2026-12-01"),
    },
    {
      organizationId: org.id,
      contractId: logisticsContract.id,
      title: "2026年12月分稼働",
      amount: 800000,
      dueDate: new Date("2027-01-31"),
      status: "scheduled",
    },
  ]);
  console.log("✅ Created contract + invoices for 配送ルート最適化 SES (3 invoices)");

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
