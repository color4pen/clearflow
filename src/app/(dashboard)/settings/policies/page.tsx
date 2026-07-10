import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { canPerform } from "@/domain/authorization";
import { listApprovalTemplates } from "@/application/usecases";
import { listPoliciesAction, togglePolicyAction } from "@/app/actions/policies";
import { PageToolbar, DataTable, SectionCard } from "@/app/components";
import { BTN_PRIMARY } from "@/app/(dashboard)/styles";
import { getTriggerActionLabel, formatCondition } from "./constants";

export default async function PoliciesPage() {
  const session = await auth();
  if (
    !session?.user ||
    !canPerform(session.user.role, "approvalSettings", "listPolicies")
  ) {
    redirect("/requests");
  }

  const isAdmin = canPerform(session.user.role, "approvalSettings", "createPolicy");

  const [policiesResult, templates] = await Promise.all([
    listPoliciesAction(),
    listApprovalTemplates({ organizationId: session.user.organizationId }),
  ]);
  const policies = policiesResult.success ? (policiesResult.policies ?? []) : [];

  const templateMap = new Map(templates.map((t) => [t.id, t.name]));

  return (
    <div>
      {/* Toolbar */}
      <PageToolbar
        title="承認ポリシー管理"
        actions={
          isAdmin ? (
            <Link
              href="/settings/policies/new"
              className={BTN_PRIMARY}
            >
              ＋ ポリシーを追加
            </Link>
          ) : undefined
        }
      />

      {policies.length === 0 ? (
        <SectionCard>
          <div className="text-center py-4 text-xs text-text-disabled">
            登録済みポリシーはありません。
          </div>
        </SectionCard>
      ) : (
        <DataTable
          columns={[
            {
              key: "name",
              header: "ポリシー名",
              render: (p) => <span className="text-text">{p.name}</span>,
            },
            {
              key: "triggerAction",
              header: "トリガーアクション",
              render: (p) => (
                <span className="text-text">
                  {getTriggerActionLabel(p.triggerAction)}
                </span>
              ),
            },
            {
              key: "condition",
              header: "条件",
              render: (p) => (
                <span className="text-text-muted">
                  {formatCondition(
                    p.conditionField,
                    p.conditionOperator,
                    p.conditionValue
                  )}
                </span>
              ),
            },
            {
              key: "templateId",
              header: "テンプレート名",
              render: (p) => (
                <span className="text-text-muted">
                  {templateMap.get(p.templateId) ?? p.templateId}
                </span>
              ),
            },
            {
              key: "isActive",
              header: "有効/無効",
              render: (p) =>
                p.isActive ? (
                  <span className="text-success text-xs font-bold">有効</span>
                ) : (
                  <span className="text-text-disabled text-xs">無効</span>
                ),
            },
            ...(isAdmin
              ? [
                  {
                    key: "actions",
                    header: "操作",
                    render: (p: (typeof policies)[number]) => {
                      const policyId = p.id;
                      const currentIsActive = p.isActive;

                      async function handleToggle() {
                        "use server";
                        await togglePolicyAction(policyId);
                      }

                      return (
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/settings/policies/${p.id}/edit`}
                            className="text-primary underline text-xs"
                          >
                            編集
                          </Link>
                          <form action={handleToggle}>
                            <button
                              type="submit"
                              className={`text-xs underline ${
                                currentIsActive
                                  ? "text-danger"
                                  : "text-success"
                              }`}
                            >
                              {currentIsActive ? "無効化" : "有効化"}
                            </button>
                          </form>
                        </div>
                      );
                    },
                  },
                ]
              : []),
          ]}
          rows={policies}
          rowKey={(p) => p.id}
          footer={<>{policies.length} 件</>}
        />
      )}
    </div>
  );
}
