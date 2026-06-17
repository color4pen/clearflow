export type RequestStatus = "draft" | "pending" | "approved" | "rejected" | "revision";

export type Request = {
  id: string;
  title: string;
  description: string | null;
  status: RequestStatus;
  organizationId: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
};
