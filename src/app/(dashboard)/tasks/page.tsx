import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listActionItems, listOrganizationUsers } from "@/application/usecases";
import { canPerform } from "@/domain/authorization";
import { PageToolbar, SectionCard } from "@/app/components";
import { TaskList } from "./TaskList";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const currentUserId = session!.user.id;
  const canDelete = canPerform(session!.user.role, "actionItem", "delete");

  const { status } = await searchParams;
  const isDone = status === "done";

  const [items, users] = await Promise.all([
    listActionItems({ organizationId, done: isDone }),
    listOrganizationUsers({ organizationId }),
  ]);

  const orgUsers = users.map((u) => ({ id: u.id, name: u.name }));

  return (
    <div>
      <PageToolbar title="タスク" />

      <div className="mt-3 mb-3 flex gap-0 border-b border-border">
        <Link
          href="/tasks?status=todo"
          className={`text-xs px-4 py-2 border-b-2 ${
            !isDone
              ? "border-primary text-primary font-bold"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          未完了
        </Link>
        <Link
          href="/tasks?status=done"
          className={`text-xs px-4 py-2 border-b-2 ${
            isDone
              ? "border-primary text-primary font-bold"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          完了
        </Link>
      </div>

      <SectionCard className="p-3">
        <TaskList
          items={items}
          orgUsers={orgUsers}
          currentUserId={currentUserId}
          canDelete={canDelete}
        />
      </SectionCard>
    </div>
  );
}
