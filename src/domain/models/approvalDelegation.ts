export type ApprovalDelegation = {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUserRole: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
};
