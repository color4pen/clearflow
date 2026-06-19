export type Client = {
  id: string;
  organizationId: string;
  name: string;
  industry: string | null;
  size: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ClientContact = {
  id: string;
  clientId: string;
  name: string;
  department: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  createdAt: Date;
};
