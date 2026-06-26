import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listActionItems, listOrganizationUsers, listDeals, listInquiries } from "@/application/usecases";
import { canPerform } from "@/domain/authorization";
import { PageToolbar, SectionCard } from "@/app/components";
import { TaskList } from "./TaskList";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; assignee?: string }>;
}) {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const currentUserId = session!.user.id;
  const canDelete = canPerform(session!.user.role, "actionItem", "delete");

  const { status, assignee } = await searchParams;
  const isDone = status === "done";
  const showAll = assignee === "all";

  const [items, users, deals, inquiries] = await Promise.all([
    listActionItems({
      organizationId,
      done: isDone,
      assigneeId: showAll ? undefined : currentUserId,
    }),
    listOrganizationUsers({ organizationId }),
    listDeals(organizationId),
    listInquiries(organizationId),
  ]);

  const orgUsers = users.map((u) => ({ id: u.id, name: u.name }));
  const dealOptions = deals.map((d) => ({ id: d.id, title: d.title }));
  const inquiryOptions = inquiries.map((i) => ({ id: i.id, title: i.title }));

  return (
    <div>
      <PageToolbar title="タスク" />

      <div className="mt-3 mb-3 flex items-center justify-between">
        <div className="flex gap-0 border-b border-border">
          <Link
            href={`/tasks?status=todo${showAll ? "&assignee=all" : ""}`}
            className={`text-xs px-4 py-2 border-b-2 ${
              !isDone
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            未完了
          </Link>
          <Link
            href={`/tasks?status=done${showAll ? "&assignee=all" : ""}`}
            className={`text-xs px-4 py-2 border-b-2 ${
              isDone
                ? "border-primary text-primary font-bold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            完了
          </Link>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/tasks?status=${isDone ? "done" : "todo"}`}
            className={`text-xs px-3 py-1 rounded ${
              !showAll
                ? "bg-primary text-white"
                : "border border-border text-text hover:bg-bg-toolbar"
            }`}
          >
            自分のタスク
          </Link>
          <Link
            href={`/tasks?status=${isDone ? "done" : "todo"}&assignee=all`}
            className={`text-xs px-3 py-1 rounded ${
              showAll
                ? "bg-primary text-white"
                : "border border-border text-text hover:bg-bg-toolbar"
            }`}
          >
            全員
          </Link>
        </div>
      </div>

      <SectionCard className="p-0">
        <TaskList
          items={items}
          orgUsers={orgUsers}
          currentUserId={currentUserId}
          canDelete={canDelete}
          dealOptions={dealOptions}
          inquiryOptions={inquiryOptions}
        />
      </SectionCard>
    </div>
  );
}
