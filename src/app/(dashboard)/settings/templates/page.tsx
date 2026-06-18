import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listTemplatesAction } from "@/app/actions/templates";
import { DeleteButton } from "./DeleteButton";
import { BTN_PRIMARY } from "../../styles";

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/requests");
  }

  const result = await listTemplatesAction();
  const templates = result.success ? result.templates ?? [] : [];

  return (
    <div>
      {/* Toolbar */}
      <div className="bg-[#f5f5f5] border border-[#cccccc] px-2 py-1 flex items-center justify-between mb-0">
        <span className="text-sm font-bold text-[#333333]">テンプレート管理</span>
        <Link
          href="/settings/templates/new"
          className={BTN_PRIMARY}
        >
          [テンプレートを追加]
        </Link>
      </div>

      <div className="bg-white border border-[#e0e0e0]">
        {templates.length === 0 ? (
          <div className="text-center py-4 text-xs text-[#95a5a6]">
            登録済みテンプレートはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#dcdde1] border border-[#bdc3c7]">
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">テンプレート名</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">金額条件</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">ステップ数</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">作成日時</th>
                  <th className="px-1 py-1.5 text-xs text-[#2c3e50] font-bold text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template, index) => {
                  const amountLabel =
                    template.minAmount != null && template.maxAmount != null
                      ? `${template.minAmount.toLocaleString()}〜${template.maxAmount.toLocaleString()}円`
                      : template.minAmount != null
                      ? `${template.minAmount.toLocaleString()}円以上`
                      : template.maxAmount != null
                      ? `${template.maxAmount.toLocaleString()}円以下`
                      : "制限なし";

                  return (
                    <tr
                      key={template.id}
                      className={`border border-[#e0e0e0] hover:bg-[#eef2f7] ${index % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}`}
                    >
                      <td className="px-1 py-1 text-xs text-[#2c3e50]">
                        {template.name}
                      </td>
                      <td className="px-1 py-1 text-xs text-[#2c3e50]">{amountLabel}</td>
                      <td className="px-1 py-1 text-xs text-[#2c3e50]">
                        {template.steps.length}
                      </td>
                      <td className="px-1 py-1 text-xs text-[#7f8c8d]">
                        {new Date(template.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-1 py-1 text-xs">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/settings/templates/${template.id}/edit`}
                            className="text-[#2980b9] underline text-xs"
                          >
                            編集
                          </Link>
                          <DeleteButton templateId={template.id} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Footer bar */}
      <div className="bg-[#f5f5f5] border border-[#cccccc] border-t-0 px-2 py-0.5 text-xs text-[#7f8c8d]">
        {templates.length} 件
      </div>
    </div>
  );
}
