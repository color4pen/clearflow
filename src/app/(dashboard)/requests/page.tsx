import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listRequests, listOrganizationUsers } from "@/application/usecases";
import { bulkApproveAction } from "@/app/actions/requests";
import { BulkApprovalPanel } from "./BulkApprovalPanel";
import { RequestTabs } from "./RequestTabs";
import { statusLabel, statusVariant } from "./statusUtils";

type Tab = "action-required" | "my-requests" | "all";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const role = session!.user.role;
  const userId = session!.user.id;

  const resolvedSearchParams = await searchParams;
  const rawTab = resolvedSearchParams.tab;

  // Determine default tab based on role
  const defaultTab: Tab = role === "member" ? "my-requests" : "action-required";

  // Resolve effective tab with authorization check
  let effectiveTab: Tab;
  if (rawTab === "all") {
    // Only admin/manager may access the "all" tab
    effectiveTab = role === "admin" || role === "manager" ? "all" : defaultTab;
  } else if (rawTab === "my-requests") {
    effectiveTab = "my-requests";
  } else if (rawTab === "action-required") {
    effectiveTab = "action-required";
  } else {
    effectiveTab = defaultTab;
  }

  const [requests, orgUsers] = await Promise.all([
    listRequests(organizationId),
    listOrganizationUsers({ organizationId }),
  ]);

  const userNameMap = new Map(orgUsers.map((u) => [u.id, u.name]));

  // Build tab lists
  // action-required: pending requests where user's role has a pending step (or legacy with no steps)
  const actionRequiredRequests = requests.filter((r) => {
    if (r.status !== "pending") return false;
    if (r.approvalSteps.length === 0) return true; // legacy single-approval
    return r.approvalSteps.some((s) => s.status === "pending" && s.approverRole === role);
  });

  const myRequests = requests.filter((r) => r.creatorId === userId);

  const showAllTab = role === "admin" || role === "manager";

  const tabs = [
    { key: "action-required" as Tab, label: "要対応", count: actionRequiredRequests.length },
    { key: "my-requests" as Tab, label: "自分の申請", count: myRequests.length },
    ...(showAllTab ? [{ key: "all" as Tab, label: "すべて", count: requests.length }] : []),
  ];

  // Filter displayed requests based on effective tab
  const filteredRequests =
    effectiveTab === "action-required"
      ? actionRequiredRequests
      : effectiveTab === "my-requests"
        ? myRequests
        : requests;

  const showBulkApproval = role !== "member";

  const boundBulkApproveAction = bulkApproveAction.bind(null);

  return (
    <div>
      <div className="flex items-center justify-between bg-bg-toolbar border border-border px-2 py-1 mb-0">
        <span className="text-sm font-bold text-text">申請管理</span>
        <div className="flex items-center gap-2">
          <Link href="/requests/new" className="text-xs text-primary underline">[新規作成]</Link>
        </div>
      </div>

      <RequestTabs currentTab={effectiveTab} tabs={tabs} />

      {filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-text-disabled text-sm bg-bg-surface border border-border border-t-0">
          <p>申請がありません</p>
          {effectiveTab === "my-requests" && (
            <Link
              href="/requests/new"
              className="mt-2 inline-block text-primary underline text-xs"
            >
              最初の申請を作成する
            </Link>
          )}
        </div>
      ) : (
        <BulkApprovalPanel
          requests={filteredRequests.map((r) => ({
            id: r.id,
            title: r.title,
            status: r.status,
            statusText: statusLabel(r.status),
            statusVariant: statusVariant(r.status),
            creatorId: r.creatorId,
            creatorName: userNameMap.get(r.creatorId) ?? r.creatorId.slice(0, 8),
            createdAt: r.createdAt,
            approvalSteps: r.approvalSteps,
            originType: r.originType,
          }))}
          bulkApproveAction={boundBulkApproveAction}
          showBulkApproval={showBulkApproval}
        />
      )}
    </div>
  );
}
