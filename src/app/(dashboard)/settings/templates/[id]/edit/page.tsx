import { redirect, notFound } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { approvalTemplateRepository } from "@/infrastructure/repositories";
import { TemplateForm } from "../../TemplateForm";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  const { id } = await params;
  const template = await approvalTemplateRepository.findById(
    id,
    session.user.organizationId
  );

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">テンプレートを編集</h1>
        <p className="mt-1 text-sm text-gray-500">
          承認テンプレートの内容を変更します。
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <TemplateForm
          mode="edit"
          templateId={template.id}
          defaultValues={{
            name: template.name,
            minAmount: template.minAmount,
            maxAmount: template.maxAmount,
            steps: template.steps.map((s) => ({
              approverRole: s.approverRole as "admin" | "member" | "manager" | "finance",
              deadlineHours: s.deadlineHours,
            })),
          }}
        />
      </div>
    </div>
  );
}
