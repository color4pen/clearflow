import type { Role } from "@/domain/models/user";

export type Entity =
  | "inquiry"
  | "deal"
  | "meeting"
  | "client"
  | "contract"
  | "invoice"
  | "approval"
  | "approvalSettings"
  | "organization"
  | "revenue"
  | "actionItem";

type PermissionMatrix = Record<Entity, Record<string, Role[]>>;

const ALL_ROLES: Role[] = ["admin", "manager", "finance", "member"];
const ADMIN_MANAGER_MEMBER: Role[] = ["admin", "manager", "member"];
const ADMIN_MANAGER: Role[] = ["admin", "manager"];
const ADMIN_MANAGER_FINANCE: Role[] = ["admin", "manager", "finance"];
const ADMIN_FINANCE: Role[] = ["admin", "finance"];
const ADMIN_MANAGER_FINANCE_MEMBER: Role[] = ["admin", "manager", "finance", "member"];
const ADMIN_ONLY: Role[] = ["admin"];

const PERMISSION_MATRIX: PermissionMatrix = {
  // 3.1 引合 (Inquiry)
  inquiry: {
    list: ALL_ROLES,
    view: ALL_ROLES,
    create: ADMIN_MANAGER_MEMBER,
    edit: ADMIN_MANAGER_MEMBER,
    convert: ADMIN_MANAGER,
    decline: ADMIN_MANAGER,
    delete: ADMIN_ONLY,
  },

  // 3.2 案件 (Deal)
  deal: {
    list: ALL_ROLES,
    view: ALL_ROLES,
    create: ADMIN_MANAGER,
    edit: ADMIN_MANAGER_MEMBER,
    changePhase: ADMIN_MANAGER_MEMBER,
    closePhase: ADMIN_MANAGER,
    manageContacts: ADMIN_MANAGER_MEMBER,
    delete: ADMIN_ONLY,
  },

  // 3.3 商談記録 (Meeting)
  meeting: {
    list: ALL_ROLES,
    view: ALL_ROLES,
    create: ADMIN_MANAGER_MEMBER,
    edit: ADMIN_MANAGER_MEMBER,
    delete: ADMIN_MANAGER,
  },

  // 3.4 顧客 (Client)
  client: {
    list: ALL_ROLES,
    view: ALL_ROLES,
    create: ADMIN_MANAGER_MEMBER,
    edit: ADMIN_MANAGER_MEMBER,
    addContact: ADMIN_MANAGER_MEMBER,
    editContact: ADMIN_MANAGER_MEMBER,
    deleteContact: ADMIN_MANAGER,
    delete: ADMIN_ONLY,
  },

  // 3.5 契約 (Contract)
  contract: {
    list: ALL_ROLES,
    view: ALL_ROLES,
    create: ADMIN_MANAGER_FINANCE,
    edit: ADMIN_MANAGER_FINANCE,
    changeStatus: ADMIN_MANAGER_FINANCE,
    delete: ADMIN_ONLY,
  },

  // 3.6 請求 (Invoice)
  invoice: {
    list: ALL_ROLES,
    view: ALL_ROLES,
    create: ADMIN_FINANCE,
    edit: ADMIN_FINANCE,
    changeStatus: ADMIN_FINANCE,
    delete: ADMIN_ONLY,
  },

  // 3.7 承認 (Approval)
  approval: {
    listRequests: ALL_ROLES,
    viewRequest: ALL_ROLES,
    submit: ALL_ROLES,
    approve: ADMIN_MANAGER_FINANCE,
    reject: ADMIN_MANAGER_FINANCE,
  },

  // 3.8 承認設定 (ApprovalSettings)
  approvalSettings: {
    listPolicies: ADMIN_MANAGER,
    createPolicy: ADMIN_ONLY,
    editPolicy: ADMIN_ONLY,
    listTemplates: ADMIN_MANAGER,
    createTemplate: ADMIN_ONLY,
    editTemplate: ADMIN_ONLY,
    deleteTemplate: ADMIN_ONLY,
    listDelegations: ADMIN_MANAGER_FINANCE_MEMBER,
    createDelegation: ADMIN_MANAGER_FINANCE,
    deactivateDelegation: ADMIN_MANAGER_FINANCE,
  },

  // 3.9 組織管理 (Organization)
  organization: {
    listUsers: ADMIN_MANAGER,
    viewAuditLog: ADMIN_MANAGER,
    changeRole: ADMIN_ONLY,
    exportAuditLog: ADMIN_ONLY,
    manageWebhooks: ADMIN_ONLY,
  },

  // 3.10 売上 (Revenue)
  revenue: {
    view: ALL_ROLES,
    setTarget: ADMIN_MANAGER,
    export: ADMIN_MANAGER_FINANCE,
  },

  // 3.11 アクションアイテム (ActionItem)
  actionItem: {
    list: ALL_ROLES,
    view: ALL_ROLES,
    create: ADMIN_MANAGER_MEMBER,
    edit: ADMIN_MANAGER_MEMBER,
    toggle: ADMIN_MANAGER_MEMBER,
    delete: ADMIN_MANAGER,
  },
};

/**
 * 指定されたロールが、エンティティに対して操作を実行できるかを判定する。
 * マトリクスに存在しないエンティティ・操作の組み合わせは false を返す（deny-by-default）。
 */
export function canPerform(role: Role, entity: Entity, operation: string): boolean {
  const entityPermissions = PERMISSION_MATRIX[entity];
  if (!entityPermissions) return false;

  const allowedRoles = entityPermissions[operation];
  if (!allowedRoles) return false;

  return allowedRoles.includes(role);
}
