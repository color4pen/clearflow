import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { TemplateForm } from "../TemplateForm";

export default async function NewTemplatePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  return (
    <div>
      <div className="bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-[#333333]">テンプレートを追加</span>
      </div>

      <div className="bg-bg-surface border border-border-light p-4">
        <TemplateForm mode="create" />
      </div>
    </div>
  );
}
