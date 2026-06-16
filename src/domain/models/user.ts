export type Role = "admin" | "member";

export type User = {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: Role;
  createdAt: Date;
};
