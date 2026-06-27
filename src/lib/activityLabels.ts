const ACTION_LABELS: Record<string, string> = {
  "deal.create": "案件を作成",
  "deal.update": "案件を更新",
  "deal.updatePhase": "フェーズを変更",
  "deal.delete": "案件を削除",
  "contract.create": "契約を作成",
  "contract.update": "契約を更新",
  "contract.cancel": "契約を解除",
  "meeting.create": "商談を記録",
  "meeting.update": "商談を更新",
  "action_item.create": "アクションアイテムを追加",
  "action_item.update": "アクションアイテムを更新",
  "action_item.toggleDone": "アクションアイテムの完了状態を変更",
  "action_item.delete": "アクションアイテムを削除",
  "deal_contact.add": "担当者を追加",
  "deal_contact.remove": "担当者を削除",
  "invoice.create": "請求を作成",
  "invoice.update": "請求を更新",
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  deal: "案件",
  contract: "契約",
  meeting: "商談",
  action_item: "アクションアイテム",
  deal_contact: "担当者",
  invoice: "請求",
};

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function getTargetTypeLabel(targetType: string): string {
  return TARGET_TYPE_LABELS[targetType] ?? targetType;
}
