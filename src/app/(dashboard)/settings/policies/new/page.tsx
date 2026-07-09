import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { canPerform } from "@/domain/authorization";
import { listApprovalTemplates } from "@/application/usecases";
import { PolicyForm } from "../PolicyForm";

export default async function NewPolicyPage() {
  const session = await auth();
  if (
    !session?.user ||
    !canPerform(session.user.role, "approvalSettings", "createPolicy")
  ) {
    redirect("/requests");
  }

  const templates = await listApprovalTemplates({
    organizationId: session.user.organizationId,
  });

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-text">ポリシーを追加</span>
      </div>

      <div className="bg-bg-surface border border-border-light p-4">
        <PolicyForm
          mode="create"
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
        />
      </div>
    </div>
  );
}
