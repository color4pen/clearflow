import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listTemplatesAction } from "@/app/actions/templates";
import { DeleteButton } from "./DeleteButton";
import { PageToolbar, DataTable, SectionCard } from "@/app/components";

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
      <PageToolbar
        title="テンプレート管理"
        actions={
          <Link
            href="/settings/templates/new"
            className="text-primary underline text-xs"
          >
            [テンプレートを追加]
          </Link>
        }
      />

      {templates.length === 0 ? (
        <SectionCard>
          <div className="text-center py-4 text-xs text-text-disabled">
            登録済みテンプレートはありません。
          </div>
        </SectionCard>
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "テンプレート名", render: (t) => <span className="text-text">{t.name}</span> },
            {
              key: "amount",
              header: "金額条件",
              render: (t) => {
                const label =
                  t.minAmount != null && t.maxAmount != null
                    ? `${t.minAmount.toLocaleString()}〜${t.maxAmount.toLocaleString()}円`
                    : t.minAmount != null
                    ? `${t.minAmount.toLocaleString()}円以上`
                    : t.maxAmount != null
                    ? `${t.maxAmount.toLocaleString()}円以下`
                    : "制限なし";
                return <span className="text-text">{label}</span>;
              },
            },
            { key: "steps", header: "ステップ数", render: (t) => <span className="text-text">{t.steps.length}</span> },
            {
              key: "createdAt",
              header: "作成日時",
              render: (t) => (
                <span className="text-text-muted">
                  {new Date(t.createdAt).toLocaleDateString("ja-JP")}
                </span>
              ),
            },
            {
              key: "actions",
              header: "操作",
              render: (t) => (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/settings/templates/${t.id}/edit`}
                    className="text-primary underline text-xs"
                  >
                    編集
                  </Link>
                  <DeleteButton templateId={t.id} />
                </div>
              ),
            },
          ]}
          rows={templates}
          rowKey={(t) => t.id}
          footer={<>{templates.length} 件</>}
        />
      )}
    </div>
  );
}
