import { describe, it, expect } from "bun:test";
import { canPerform } from "@/domain/authorization";
import type { Role } from "@/domain/models/user";

const ALL_ROLES: Role[] = ["admin", "manager", "finance", "member"];

describe("canPerform - 引合 (inquiry)", () => {
  it("list: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "inquiry", "list")).toBe(true);
    }
  });

  it("view: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "inquiry", "view")).toBe(true);
    }
  });

  it("create: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "inquiry", "create")).toBe(true);
    expect(canPerform("manager", "inquiry", "create")).toBe(true);
    expect(canPerform("member", "inquiry", "create")).toBe(true);
    expect(canPerform("finance", "inquiry", "create")).toBe(false);
  });

  it("edit: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "inquiry", "edit")).toBe(true);
    expect(canPerform("manager", "inquiry", "edit")).toBe(true);
    expect(canPerform("member", "inquiry", "edit")).toBe(true);
    expect(canPerform("finance", "inquiry", "edit")).toBe(false);
  });

  it("convert: admin/manager のみ許可される", () => {
    expect(canPerform("admin", "inquiry", "convert")).toBe(true);
    expect(canPerform("manager", "inquiry", "convert")).toBe(true);
    expect(canPerform("finance", "inquiry", "convert")).toBe(false);
    expect(canPerform("member", "inquiry", "convert")).toBe(false);
  });

  it("decline: admin/manager のみ許可される", () => {
    expect(canPerform("admin", "inquiry", "decline")).toBe(true);
    expect(canPerform("manager", "inquiry", "decline")).toBe(true);
    expect(canPerform("finance", "inquiry", "decline")).toBe(false);
    expect(canPerform("member", "inquiry", "decline")).toBe(false);
  });

  it("delete: admin のみ許可される", () => {
    expect(canPerform("admin", "inquiry", "delete")).toBe(true);
    expect(canPerform("manager", "inquiry", "delete")).toBe(false);
    expect(canPerform("finance", "inquiry", "delete")).toBe(false);
    expect(canPerform("member", "inquiry", "delete")).toBe(false);
  });
});

describe("canPerform - 案件 (deal)", () => {
  it("list/view: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "deal", "list")).toBe(true);
      expect(canPerform(role, "deal", "view")).toBe(true);
    }
  });

  it("create: admin/manager のみ許可される", () => {
    expect(canPerform("admin", "deal", "create")).toBe(true);
    expect(canPerform("manager", "deal", "create")).toBe(true);
    expect(canPerform("finance", "deal", "create")).toBe(false);
    expect(canPerform("member", "deal", "create")).toBe(false);
  });

  it("edit: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "deal", "edit")).toBe(true);
    expect(canPerform("manager", "deal", "edit")).toBe(true);
    expect(canPerform("member", "deal", "edit")).toBe(true);
    expect(canPerform("finance", "deal", "edit")).toBe(false);
  });

  it("changePhase: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "deal", "changePhase")).toBe(true);
    expect(canPerform("manager", "deal", "changePhase")).toBe(true);
    expect(canPerform("member", "deal", "changePhase")).toBe(true);
    expect(canPerform("finance", "deal", "changePhase")).toBe(false);
  });

  it("closePhase: admin/manager のみ許可される", () => {
    expect(canPerform("admin", "deal", "closePhase")).toBe(true);
    expect(canPerform("manager", "deal", "closePhase")).toBe(true);
    expect(canPerform("finance", "deal", "closePhase")).toBe(false);
    expect(canPerform("member", "deal", "closePhase")).toBe(false);
  });

  it("manageContacts: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "deal", "manageContacts")).toBe(true);
    expect(canPerform("manager", "deal", "manageContacts")).toBe(true);
    expect(canPerform("member", "deal", "manageContacts")).toBe(true);
    expect(canPerform("finance", "deal", "manageContacts")).toBe(false);
  });

  it("delete: admin のみ許可される", () => {
    expect(canPerform("admin", "deal", "delete")).toBe(true);
    expect(canPerform("manager", "deal", "delete")).toBe(false);
    expect(canPerform("finance", "deal", "delete")).toBe(false);
    expect(canPerform("member", "deal", "delete")).toBe(false);
  });
});

describe("canPerform - 商談記録 (meeting)", () => {
  it("list/view: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "meeting", "list")).toBe(true);
      expect(canPerform(role, "meeting", "view")).toBe(true);
    }
  });

  it("create: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "meeting", "create")).toBe(true);
    expect(canPerform("manager", "meeting", "create")).toBe(true);
    expect(canPerform("member", "meeting", "create")).toBe(true);
    expect(canPerform("finance", "meeting", "create")).toBe(false);
  });

  it("edit: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "meeting", "edit")).toBe(true);
    expect(canPerform("manager", "meeting", "edit")).toBe(true);
    expect(canPerform("member", "meeting", "edit")).toBe(true);
    expect(canPerform("finance", "meeting", "edit")).toBe(false);
  });

  it("delete: admin/manager のみ許可される", () => {
    expect(canPerform("admin", "meeting", "delete")).toBe(true);
    expect(canPerform("manager", "meeting", "delete")).toBe(true);
    expect(canPerform("finance", "meeting", "delete")).toBe(false);
    expect(canPerform("member", "meeting", "delete")).toBe(false);
  });
});

describe("canPerform - 顧客 (client)", () => {
  it("list/view: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "client", "list")).toBe(true);
      expect(canPerform(role, "client", "view")).toBe(true);
    }
  });

  it("create: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "client", "create")).toBe(true);
    expect(canPerform("manager", "client", "create")).toBe(true);
    expect(canPerform("member", "client", "create")).toBe(true);
    expect(canPerform("finance", "client", "create")).toBe(false);
  });

  it("edit: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "client", "edit")).toBe(true);
    expect(canPerform("manager", "client", "edit")).toBe(true);
    expect(canPerform("member", "client", "edit")).toBe(true);
    expect(canPerform("finance", "client", "edit")).toBe(false);
  });

  it("addContact: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "client", "addContact")).toBe(true);
    expect(canPerform("manager", "client", "addContact")).toBe(true);
    expect(canPerform("member", "client", "addContact")).toBe(true);
    expect(canPerform("finance", "client", "addContact")).toBe(false);
  });

  it("editContact: admin/manager/member が許可される", () => {
    expect(canPerform("admin", "client", "editContact")).toBe(true);
    expect(canPerform("manager", "client", "editContact")).toBe(true);
    expect(canPerform("member", "client", "editContact")).toBe(true);
    expect(canPerform("finance", "client", "editContact")).toBe(false);
  });

  it("deleteContact: admin/manager のみ許可される", () => {
    expect(canPerform("admin", "client", "deleteContact")).toBe(true);
    expect(canPerform("manager", "client", "deleteContact")).toBe(true);
    expect(canPerform("finance", "client", "deleteContact")).toBe(false);
    expect(canPerform("member", "client", "deleteContact")).toBe(false);
  });

  it("delete: admin のみ許可される", () => {
    expect(canPerform("admin", "client", "delete")).toBe(true);
    expect(canPerform("manager", "client", "delete")).toBe(false);
    expect(canPerform("finance", "client", "delete")).toBe(false);
    expect(canPerform("member", "client", "delete")).toBe(false);
  });
});

describe("canPerform - 契約 (contract)", () => {
  it("list/view: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "contract", "list")).toBe(true);
      expect(canPerform(role, "contract", "view")).toBe(true);
    }
  });

  it("create: admin/manager/finance が許可される", () => {
    expect(canPerform("admin", "contract", "create")).toBe(true);
    expect(canPerform("manager", "contract", "create")).toBe(true);
    expect(canPerform("finance", "contract", "create")).toBe(true);
    expect(canPerform("member", "contract", "create")).toBe(false);
  });

  it("edit: admin/manager/finance が許可される", () => {
    expect(canPerform("admin", "contract", "edit")).toBe(true);
    expect(canPerform("manager", "contract", "edit")).toBe(true);
    expect(canPerform("finance", "contract", "edit")).toBe(true);
    expect(canPerform("member", "contract", "edit")).toBe(false);
  });

  it("changeStatus: admin/manager/finance が許可される", () => {
    expect(canPerform("admin", "contract", "changeStatus")).toBe(true);
    expect(canPerform("manager", "contract", "changeStatus")).toBe(true);
    expect(canPerform("finance", "contract", "changeStatus")).toBe(true);
    expect(canPerform("member", "contract", "changeStatus")).toBe(false);
  });

  it("delete: admin のみ許可される", () => {
    expect(canPerform("admin", "contract", "delete")).toBe(true);
    expect(canPerform("manager", "contract", "delete")).toBe(false);
    expect(canPerform("finance", "contract", "delete")).toBe(false);
    expect(canPerform("member", "contract", "delete")).toBe(false);
  });
});

describe("canPerform - 請求 (invoice)", () => {
  it("list/view: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "invoice", "list")).toBe(true);
      expect(canPerform(role, "invoice", "view")).toBe(true);
    }
  });

  it("create: admin/finance のみ許可される", () => {
    expect(canPerform("admin", "invoice", "create")).toBe(true);
    expect(canPerform("finance", "invoice", "create")).toBe(true);
    expect(canPerform("manager", "invoice", "create")).toBe(false);
    expect(canPerform("member", "invoice", "create")).toBe(false);
  });

  it("edit: admin/finance のみ許可される", () => {
    expect(canPerform("admin", "invoice", "edit")).toBe(true);
    expect(canPerform("finance", "invoice", "edit")).toBe(true);
    expect(canPerform("manager", "invoice", "edit")).toBe(false);
    expect(canPerform("member", "invoice", "edit")).toBe(false);
  });

  it("changeStatus: admin/finance のみ許可される", () => {
    expect(canPerform("admin", "invoice", "changeStatus")).toBe(true);
    expect(canPerform("finance", "invoice", "changeStatus")).toBe(true);
    expect(canPerform("manager", "invoice", "changeStatus")).toBe(false);
    expect(canPerform("member", "invoice", "changeStatus")).toBe(false);
  });

  it("delete: admin のみ許可される", () => {
    expect(canPerform("admin", "invoice", "delete")).toBe(true);
    expect(canPerform("manager", "invoice", "delete")).toBe(false);
    expect(canPerform("finance", "invoice", "delete")).toBe(false);
    expect(canPerform("member", "invoice", "delete")).toBe(false);
  });
});

describe("canPerform - 承認 (approval)", () => {
  it("listRequests/viewRequest/submit: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "approval", "listRequests")).toBe(true);
      expect(canPerform(role, "approval", "viewRequest")).toBe(true);
      expect(canPerform(role, "approval", "submit")).toBe(true);
    }
  });

  it("approve: admin/manager/finance が許可される", () => {
    expect(canPerform("admin", "approval", "approve")).toBe(true);
    expect(canPerform("manager", "approval", "approve")).toBe(true);
    expect(canPerform("finance", "approval", "approve")).toBe(true);
    expect(canPerform("member", "approval", "approve")).toBe(false);
  });

  it("reject: admin/manager/finance が許可される", () => {
    expect(canPerform("admin", "approval", "reject")).toBe(true);
    expect(canPerform("manager", "approval", "reject")).toBe(true);
    expect(canPerform("finance", "approval", "reject")).toBe(true);
    expect(canPerform("member", "approval", "reject")).toBe(false);
  });
});

describe("canPerform - 承認設定 (approvalSettings)", () => {
  it("listPolicies/listTemplates: admin/manager が許可される", () => {
    expect(canPerform("admin", "approvalSettings", "listPolicies")).toBe(true);
    expect(canPerform("manager", "approvalSettings", "listPolicies")).toBe(true);
    expect(canPerform("finance", "approvalSettings", "listPolicies")).toBe(false);
    expect(canPerform("member", "approvalSettings", "listPolicies")).toBe(false);

    expect(canPerform("admin", "approvalSettings", "listTemplates")).toBe(true);
    expect(canPerform("manager", "approvalSettings", "listTemplates")).toBe(true);
    expect(canPerform("finance", "approvalSettings", "listTemplates")).toBe(false);
    expect(canPerform("member", "approvalSettings", "listTemplates")).toBe(false);
  });

  it("createPolicy/editPolicy: admin のみ許可される", () => {
    expect(canPerform("admin", "approvalSettings", "createPolicy")).toBe(true);
    expect(canPerform("manager", "approvalSettings", "createPolicy")).toBe(false);
    expect(canPerform("finance", "approvalSettings", "createPolicy")).toBe(false);
    expect(canPerform("member", "approvalSettings", "createPolicy")).toBe(false);

    expect(canPerform("admin", "approvalSettings", "editPolicy")).toBe(true);
    expect(canPerform("manager", "approvalSettings", "editPolicy")).toBe(false);
    expect(canPerform("finance", "approvalSettings", "editPolicy")).toBe(false);
    expect(canPerform("member", "approvalSettings", "editPolicy")).toBe(false);
  });

  it("createTemplate/editTemplate/deleteTemplate: admin のみ許可される", () => {
    expect(canPerform("admin", "approvalSettings", "createTemplate")).toBe(true);
    expect(canPerform("manager", "approvalSettings", "createTemplate")).toBe(false);
    expect(canPerform("admin", "approvalSettings", "editTemplate")).toBe(true);
    expect(canPerform("manager", "approvalSettings", "editTemplate")).toBe(false);
    expect(canPerform("admin", "approvalSettings", "deleteTemplate")).toBe(true);
    expect(canPerform("manager", "approvalSettings", "deleteTemplate")).toBe(false);
  });

  it("listDelegations: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "approvalSettings", "listDelegations")).toBe(true);
    }
  });

  it("createDelegation/deactivateDelegation: admin/manager/finance が許可される", () => {
    expect(canPerform("admin", "approvalSettings", "createDelegation")).toBe(true);
    expect(canPerform("manager", "approvalSettings", "createDelegation")).toBe(true);
    expect(canPerform("finance", "approvalSettings", "createDelegation")).toBe(true);
    expect(canPerform("member", "approvalSettings", "createDelegation")).toBe(false);

    expect(canPerform("admin", "approvalSettings", "deactivateDelegation")).toBe(true);
    expect(canPerform("manager", "approvalSettings", "deactivateDelegation")).toBe(true);
    expect(canPerform("finance", "approvalSettings", "deactivateDelegation")).toBe(true);
    expect(canPerform("member", "approvalSettings", "deactivateDelegation")).toBe(false);
  });
});

describe("canPerform - 組織管理 (organization)", () => {
  it("listUsers/viewAuditLog: admin/manager が許可される", () => {
    expect(canPerform("admin", "organization", "listUsers")).toBe(true);
    expect(canPerform("manager", "organization", "listUsers")).toBe(true);
    expect(canPerform("finance", "organization", "listUsers")).toBe(false);
    expect(canPerform("member", "organization", "listUsers")).toBe(false);

    expect(canPerform("admin", "organization", "viewAuditLog")).toBe(true);
    expect(canPerform("manager", "organization", "viewAuditLog")).toBe(true);
    expect(canPerform("finance", "organization", "viewAuditLog")).toBe(false);
    expect(canPerform("member", "organization", "viewAuditLog")).toBe(false);
  });

  it("changeRole/exportAuditLog/manageWebhooks: admin のみ許可される", () => {
    expect(canPerform("admin", "organization", "changeRole")).toBe(true);
    expect(canPerform("manager", "organization", "changeRole")).toBe(false);
    expect(canPerform("finance", "organization", "changeRole")).toBe(false);
    expect(canPerform("member", "organization", "changeRole")).toBe(false);

    expect(canPerform("admin", "organization", "exportAuditLog")).toBe(true);
    expect(canPerform("manager", "organization", "exportAuditLog")).toBe(false);

    expect(canPerform("admin", "organization", "manageWebhooks")).toBe(true);
    expect(canPerform("manager", "organization", "manageWebhooks")).toBe(false);
    expect(canPerform("finance", "organization", "manageWebhooks")).toBe(false);
    expect(canPerform("member", "organization", "manageWebhooks")).toBe(false);
  });

  it("createUser: admin のみ許可される", () => {
    expect(canPerform("admin", "organization", "createUser")).toBe(true);
    expect(canPerform("manager", "organization", "createUser")).toBe(false);
    expect(canPerform("finance", "organization", "createUser")).toBe(false);
    expect(canPerform("member", "organization", "createUser")).toBe(false);
  });
});

describe("canPerform - アクションアイテム (actionItem)", () => {
  /**
   * TC-007: canPerform("member", "actionItem", "create") が true を返す
   */
  it("TC-007: create: member が許可される", () => {
    expect(canPerform("member", "actionItem", "create")).toBe(true);
  });

  /**
   * TC-008: canPerform("member", "actionItem", "delete") が false を返す
   */
  it("TC-008: delete: member が拒否される", () => {
    expect(canPerform("member", "actionItem", "delete")).toBe(false);
  });

  /**
   * TC-009: canPerform("finance", "actionItem", "create") が false を返す
   */
  it("TC-009: create: finance が拒否される", () => {
    expect(canPerform("finance", "actionItem", "create")).toBe(false);
  });

  /**
   * TC-010: canPerform("admin", "actionItem", "delete") が true を返す
   */
  it("TC-010: delete: admin が許可される", () => {
    expect(canPerform("admin", "actionItem", "delete")).toBe(true);
  });

  it("create: admin/manager/member が許可され、finance は拒否される", () => {
    expect(canPerform("admin", "actionItem", "create")).toBe(true);
    expect(canPerform("manager", "actionItem", "create")).toBe(true);
    expect(canPerform("member", "actionItem", "create")).toBe(true);
    expect(canPerform("finance", "actionItem", "create")).toBe(false);
  });

  it("edit: admin/manager/member が許可され、finance は拒否される", () => {
    expect(canPerform("admin", "actionItem", "edit")).toBe(true);
    expect(canPerform("manager", "actionItem", "edit")).toBe(true);
    expect(canPerform("member", "actionItem", "edit")).toBe(true);
    expect(canPerform("finance", "actionItem", "edit")).toBe(false);
  });

  it("toggle: admin/manager/member が許可され、finance は拒否される", () => {
    expect(canPerform("admin", "actionItem", "toggle")).toBe(true);
    expect(canPerform("manager", "actionItem", "toggle")).toBe(true);
    expect(canPerform("member", "actionItem", "toggle")).toBe(true);
    expect(canPerform("finance", "actionItem", "toggle")).toBe(false);
  });

  it("delete: admin/manager のみ許可される", () => {
    expect(canPerform("admin", "actionItem", "delete")).toBe(true);
    expect(canPerform("manager", "actionItem", "delete")).toBe(true);
    expect(canPerform("finance", "actionItem", "delete")).toBe(false);
    expect(canPerform("member", "actionItem", "delete")).toBe(false);
  });

  it("list/view: 全ロールが許可される", () => {
    for (const role of ALL_ROLES) {
      expect(canPerform(role, "actionItem", "list")).toBe(true);
      expect(canPerform(role, "actionItem", "view")).toBe(true);
    }
  });
});

describe("canPerform - 組織設定 updateOrganization", () => {
  it("admin のみ updateOrganization が許可される", () => {
    expect(canPerform("admin", "organization", "updateOrganization")).toBe(true);
    expect(canPerform("manager", "organization", "updateOrganization")).toBe(false);
    expect(canPerform("finance", "organization", "updateOrganization")).toBe(false);
    expect(canPerform("member", "organization", "updateOrganization")).toBe(false);
  });
});

describe("canPerform - 組織管理 deactivateUser", () => {
  it("deactivateUser: admin のみ許可される", () => {
    expect(canPerform("admin", "organization", "deactivateUser")).toBe(true);
    expect(canPerform("manager", "organization", "deactivateUser")).toBe(false);
    expect(canPerform("finance", "organization", "deactivateUser")).toBe(false);
    expect(canPerform("member", "organization", "deactivateUser")).toBe(false);
  });
});

describe("canPerform - deny-by-default", () => {
  it("未定義の操作は false を返す", () => {
    expect(canPerform("admin", "inquiry", "unknownOp")).toBe(false);
    expect(canPerform("admin", "deal", "destroy")).toBe(false);
    expect(canPerform("member", "contract", "someOp")).toBe(false);
  });
});
