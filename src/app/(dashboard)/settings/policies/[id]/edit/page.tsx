import { redirect, notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { canPerform } from "@/domain/authorization";
import {
  approvalPolicyRepository,
  approvalTemplateRepository,
} from "@/infrastructure/repositories";
import { PolicyForm } from "../../PolicyForm";

export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (
    !session?.user ||
    !canPerform(session.user.role, "approvalSettings", "editPolicy")
  ) {
    redirect("/requests");
  }

  const { id } = await params;
  const [policy, templates] = await Promise.all([
    approvalPolicyRepository.findById(id, session.user.organizationId),
    approvalTemplateRepository.findByOrganization(session.user.organizationId),
  ]);

  if (!policy) {
    notFound();
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-[#333333]">ポリシーを編集</span>
      </div>

      <div className="bg-bg-surface border border-border-light p-4">
        <PolicyForm
          mode="edit"
          policyId={policy.id}
          defaultValues={{
            name: policy.name,
            description: policy.description,
            triggerAction: policy.triggerAction,
            conditionField: policy.conditionField,
            conditionOperator: policy.conditionOperator,
            conditionValue: policy.conditionValue,
            templateId: policy.templateId,
          }}
          templates={templates.map((t) => ({ id: t.id, name: t.name }))}
        />
      </div>
    </div>
  );
}
