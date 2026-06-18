import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listRequests, listOrganizationUsers } from "@/application/usecases";
import { bulkApproveAction } from "@/app/actions/requests";
import { BulkApprovalPanel } from "./BulkApprovalPanel";
import { statusLabel, statusClass } from "./statusUtils";

export default async function RequestsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const role = session!.user.role;
  const [requests, orgUsers] = await Promise.all([
    listRequests(organizationId),
    listOrganizationUsers({ organizationId }),
  ]);

  const userNameMap = new Map(orgUsers.map((u) => [u.id, u.name]));

  const showBulkApproval = role !== "member";

  const boundBulkApproveAction = bulkApproveAction.bind(null);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;
  const revisionCount = requests.filter((r) => r.status === "revision").length;
  const expiredCount = requests.filter((r) => r.status === "expired").length;

  return (
    <div>
      <div className="flex items-center justify-between bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-[#333333]">申請管理</span>
          <span className="text-border mx-1">|</span>
          <span className="text-xs text-text-secondary underline cursor-pointer">全て {requests.length}</span>
          <span className="text-xs text-warning ml-2">承認待 {pendingCount}</span>
          <span className="text-xs text-success ml-2">承認済 {approvedCount}</span>
          <span className="text-xs text-danger ml-2">却下 {rejectedCount}</span>
          {revisionCount > 0 && <span className="text-xs text-revision ml-2">差戻 {revisionCount}</span>}
          {expiredCount > 0 && <span className="text-xs text-expired ml-2">期限切 {expiredCount}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/requests/new" className="text-xs text-primary underline">[新規作成]</Link>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8 text-text-disabled text-sm bg-bg-surface border border-border-light border-t-0">
          <p>申請がありません</p>
          <Link
            href="/requests/new"
            className="mt-2 inline-block text-primary underline text-xs"
          >
            最初の申請を作成する
          </Link>
        </div>
      ) : (
        <BulkApprovalPanel
          requests={requests.map((r) => {
            // Find the nearest pending step's deadline
            const pendingStep = r.approvalSteps.find((s) => s.status === "pending");
            const currentDeadline = pendingStep?.deadline ?? null;

            return {
              id: r.id,
              title: r.title,
              status: r.status,
              statusText: statusLabel(r.status),
              statusClass: statusClass(r.status),
              statusRowClass: "",
              amount: r.amount,
              creatorId: r.creatorId,
              creatorName: userNameMap.get(r.creatorId) ?? r.creatorId.slice(0, 8),
              createdAt: r.createdAt,
              approvalSteps: r.approvalSteps,
              currentDeadline,
            };
          })}
          bulkApproveAction={boundBulkApproveAction}
          showBulkApproval={showBulkApproval}
        />
      )}
    </div>
  );
}
