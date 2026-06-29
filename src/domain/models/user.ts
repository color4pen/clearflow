export type Role = "admin" | "member" | "manager" | "finance";

export type User = {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: Role;
  notificationsLastSeenAt: Date | null;
  createdAt: Date;
  deactivatedAt: Date | null;
};
