export const statusLabels: Record<string, string> = {
  new: "新規",
  in_progress: "対応中",
  converted: "案件化済",
  declined: "見送り",
};

export const sourceLabels: Record<string, string> = {
  web: "Web",
  phone: "電話",
  referral: "紹介",
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
  estimate_approval: "見積承認中",
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
