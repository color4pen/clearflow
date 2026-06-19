import { eq, and } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { clients, clientContacts } from "../schema";
import type { Client, ClientContact } from "@/domain/models/client";

function mapRow(row: typeof clients.$inferSelect): Client {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    industry: row.industry ?? null,
    size: row.size ?? null,
    address: row.address ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapContactRow(row: typeof clientContacts.$inferSelect): ClientContact {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    department: row.department ?? null,
    position: row.position ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    isPrimary: row.isPrimary,
    createdAt: row.createdAt,
  };
}

export async function create(
  data: {
    name: string;
    organizationId: string;
    industry?: string | null;
    size?: string | null;
    address?: string | null;
    notes?: string | null;
  },
  tx?: Transaction
): Promise<Client> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(clients)
    .values({
      name: data.name,
      organizationId: data.organizationId,
      industry: data.industry ?? null,
      size: data.size ?? null,
      address: data.address ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  return mapRow(result[0]);
}

export async function findById(
  id: string,
  organizationId: string,
  tx?: Transaction
): Promise<Client | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}

export async function findAllByOrganization(
  organizationId: string
): Promise<Client[]> {
  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.organizationId, organizationId))
    .orderBy(clients.createdAt);
  return result.map(mapRow);
}

export async function update(
  id: string,
  organizationId: string,
  data: Partial<{
    name: string;
    industry: string | null;
    size: string | null;
    address: string | null;
    notes: string | null;
  }>,
  tx?: Transaction
): Promise<Client | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
    .returning();
  return result[0] ? mapRow(result[0]) : null;
}

export async function createContact(
  data: {
    clientId: string;
    name: string;
    department?: string | null;
    position?: string | null;
    email?: string | null;
    phone?: string | null;
    isPrimary?: boolean;
  },
  tx?: Transaction
): Promise<ClientContact> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(clientContacts)
    .values({
      clientId: data.clientId,
      name: data.name,
      department: data.department ?? null,
      position: data.position ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      isPrimary: data.isPrimary ?? false,
    })
    .returning();
  return mapContactRow(result[0]);
}

export async function findContactsByClientId(
  clientId: string,
  tx?: Transaction
): Promise<ClientContact[]> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .select()
    .from(clientContacts)
    .where(eq(clientContacts.clientId, clientId));
  return result.map(mapContactRow);
}
