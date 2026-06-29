import type { AuditAction } from "@/domain/models/auditLog";
import {
  phaseLabels,
  contractStatusLabels,
  invoiceStatusLabels,
} from "@/app/(dashboard)/labels";

// キーは実際に監査ログへ記録される action 文字列と一致させること。
const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  "deal.create": "案件を作成",
  "deal.update": "案件を更新",
  "deal.updatePhase": "フェーズを変更",
  "deal.delete": "案件を削除",
  "contract.create": "契約を作成",
  "contract.update": "契約を更新",
  "contract.updateStatus": "契約ステータスを変更",
  "contract.delete": "契約を削除",
  "interaction.create": "商談を記録",
  "interaction.update": "商談を更新",
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

/** 状態遷移の値（生キー）を日本語ラベルに変換する。 */
function getValueLabel(action: string, value: string): string {
  if (action === "deal.updatePhase") {
    return phaseLabels[value] ?? value;
  }
  if (action === "contract.updateStatus") {
    return contractStatusLabels[value] ?? value;
  }
  if (action === "invoice.update_status") {
    return invoiceStatusLabels[value] ?? value;
  }
  return value;
}

/**
 * TimelineEntry を人間可読なアクション文に変換する。
 * 状態遷移 (transition が非 null) の場合は「ラベル：変更前 → 変更後」形式で返す。
 */
export function getActionLabel(entry: {
  action: string;
  transition?: { from: string; to: string } | null;
}): string {
  const baseLabel = ACTION_LABELS[entry.action as AuditAction] ?? entry.action;

  if (entry.transition) {
    const fromLabel = getValueLabel(entry.action, entry.transition.from);
    const toLabel = getValueLabel(entry.action, entry.transition.to);
    return `${baseLabel}：${fromLabel} → ${toLabel}`;
  }

  return baseLabel;
}
