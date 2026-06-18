import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth";
import { TemplateForm } from "../TemplateForm";

export default async function NewTemplatePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">テンプレートを追加</h1>
        <p className="mt-1 text-sm text-gray-500">
          新しい承認テンプレートを作成します。
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <TemplateForm mode="create" />
      </div>
    </div>
  );
}
