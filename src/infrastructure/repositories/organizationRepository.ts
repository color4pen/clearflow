import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { organizations } from "../schema";
import type { Organization } from "@/domain/models/organization";

export async function create(
  data: { name: string },
  tx?: Transaction
): Promise<Organization> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .insert(organizations)
    .values({ name: data.name })
    .returning();
  return result[0];
}

export async function findAll(): Promise<Organization[]> {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));
}

export async function findById(
  id: string,
  organizationId: string
): Promise<Organization | null> {
  const result = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.id, id), eq(organizations.id, organizationId)))
    .limit(1);
  return result[0] ?? null;
}

export async function update(
  id: string,
  organizationId: string,
  data: { name: string },
  tx?: Transaction
): Promise<Organization | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(organizations)
    .set({ name: data.name })
    .where(
      and(
        eq(organizations.id, id),
        eq(organizations.id, organizationId)
      )
    )
    .returning();
  return result[0] ?? null;
}
