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
    <div>
      <div className="bg-[#f5f5f5] border border-[#cccccc] px-2 py-1 mb-0">
        <span className="text-sm font-bold text-[#333333]">テンプレートを編集</span>
      </div>

      <div className="bg-white border border-[#e0e0e0] p-4">
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
