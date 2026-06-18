import Link from "next/link";
import { auth } from "@/infrastructure/auth";
import { listRequests } from "@/application/usecases";
import { bulkApproveAction } from "@/app/actions/requests";
import { BulkApprovalPanel } from "./BulkApprovalPanel";
import { BTN_PRIMARY } from "../styles";
import { statusLabel, statusClass, statusRowClass } from "./statusUtils";

export default async function RequestsPage() {
  const session = await auth();
  const organizationId = session!.user.organizationId;
  const role = session!.user.role;
  const requests = await listRequests(organizationId);

  const showBulkApproval = role !== "member";

  const boundBulkApproveAction = bulkApproveAction.bind(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">申請一覧</h2>
        <Link
          href="/requests/new"
          className={BTN_PRIMARY}
        >
          新規申請
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>申請がありません</p>
          <Link
            href="/requests/new"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
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
              statusRowClass: statusRowClass(r.status),
              amount: r.amount,
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
