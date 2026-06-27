import type { AuditLog } from "@/domain/models/auditLog";

// キーは実際に監査ログへ記録される action 文字列と一致させること。
const ACTION_LABELS: Record<string, string> = {
  "deal.create": "案件を作成",
  "deal.update": "案件を更新",
  "deal.updatePhase": "フェーズを変更",
  "deal.delete": "案件を削除",
  "contract.create": "契約を作成",
  "contract.update": "契約を更新",
  "contract.updateStatus": "契約ステータスを変更",
  "contract.delete": "契約を削除",
  "meeting.create": "商談を記録",
  "meeting.update": "商談を更新",
  "action_item.create": "アクションアイテムを追加",
  "action_item.update": "アクションアイテムを更新",
  "action_item.delete": "アクションアイテムを削除",
  "deal_contact.create": "担当者を追加",
  "deal_contact.delete": "担当者を削除",
  "invoice.create": "請求を作成",
  "invoice.update": "請求を更新",
  "invoice.update_status": "請求ステータスを変更",
};

// 監査ログ1件を人間可読なアクション文に変換する。文には対象の名詞を含む。
// action_item.toggle は metadata.done で「完了」「完了を取り消し」を区別する。
export function getActionLabel(log: Pick<AuditLog, "action" | "metadata">): string {
  if (log.action === "action_item.toggle") {
    return log.metadata?.done === true
      ? "アクションアイテムを完了"
      : "アクションアイテムの完了を取り消し";
  }
  return ACTION_LABELS[log.action] ?? log.action;
}
