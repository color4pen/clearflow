import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { users } from "../schema";
import type { User } from "@/domain/models/user";

type UserWithPassword = User & { hashedPassword: string };

export async function findByEmailForAuth(
  email: string
): Promise<UserWithPassword | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!result[0]) return null;
  const row = result[0];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    organizationId: row.organizationId,
    role: row.role,
    createdAt: row.createdAt,
    hashedPassword: row.hashedPassword,
  };
}

export async function findById(
  id: string,
  organizationId: string
): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), eq(users.organizationId, organizationId)))
    .limit(1);
  if (!result[0]) return null;
  const row = result[0];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    organizationId: row.organizationId,
    role: row.role,
    createdAt: row.createdAt,
  };
}
