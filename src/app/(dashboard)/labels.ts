export const statusLabels: Record<string, string> = {
  new: "新規",
  converted: "案件化済",
  declined: "見送り",
};

export const sourceLabels: Record<string, string> = {
  web: "Web",
  phone: "電話",
  email: "メール",
  referral: "紹介",
  agent_service: "仲介サービス",
  exhibition: "展示会",
  other: "その他",
};

export const meetingTypeLabels: Record<string, string> = {
  hearing: "ヒアリング",
  proposal: "提案",
  negotiation: "交渉",
  closing: "クロージング",
  followup: "フォローアップ",
};

export const phaseLabels: Record<string, string> = {
  proposal_prep: "提案準備",
  proposed: "提案済",
  negotiation: "交渉中",
  won: "受注",
  lost: "失注",
};

export const contractTypeLabels: Record<string, string> = {
  quasi_delegation: "準委任",
  fixed_price: "請負",
  ses: "SES",
};

export const dealContactRoleLabels: Record<string, string> = {
  key_person: "キーマン",
  decision_maker: "決裁者",
  technical: "技術担当",
  other: "その他",
};

export const contractStatusLabels: Record<string, string> = {
  active: "契約中",
  completed: "完了",
  cancelled: "解約",
};

export const renewalTypeLabels: Record<string, string> = {
  one_time: "スポット",
  recurring: "定期",
};

export const invoiceStatusLabels: Record<string, string> = {
  scheduled: "予定",
  invoiced: "請求済",
  paid: "入金済",
  overdue: "期日超過",
};

export const aggregationAxisLabels: Record<string, string> = {
  monthly: "月別",
  customer: "顧客別",
  deal: "案件別",
};
