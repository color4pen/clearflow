import { eq, and } from "drizzle-orm";
import { db } from "../db";
import type { Transaction } from "../db";
import { users } from "../schema";
import type { User, Role } from "@/domain/models/user";

type UserWithPassword = User & { hashedPassword: string };

export async function findByOrganization(
  organizationId: string
): Promise<User[]> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      organizationId: users.organizationId,
      role: users.role,
      notificationsLastSeenAt: users.notificationsLastSeenAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.organizationId, organizationId));
  return result;
}

export async function updateRole(
  id: string,
  organizationId: string,
  role: Role,
  tx?: Transaction
): Promise<User | null> {
  const queryRunner = tx ?? db;
  const result = await queryRunner
    .update(users)
    .set({ role })
    .where(
      and(
        eq(users.id, id),
        eq(users.organizationId, organizationId)
      )
    )
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      organizationId: users.organizationId,
      role: users.role,
      notificationsLastSeenAt: users.notificationsLastSeenAt,
      createdAt: users.createdAt,
    });
  return result[0] ?? null;
}

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
    notificationsLastSeenAt: row.notificationsLastSeenAt,
    createdAt: row.createdAt,
    hashedPassword: row.hashedPassword,
  };
}

export async function findById(
  id: string,
  organizationId: string
): Promise<User | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      organizationId: users.organizationId,
      role: users.role,
      notificationsLastSeenAt: users.notificationsLastSeenAt,
      createdAt: users.createdAt,
    })
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
    notificationsLastSeenAt: row.notificationsLastSeenAt,
    createdAt: row.createdAt,
  };
}

export async function updateNotificationsLastSeenAt(
  userId: string,
  organizationId: string,
  timestamp: Date,
  tx?: Transaction
): Promise<void> {
  const queryRunner = tx ?? db;
  await queryRunner
    .update(users)
    .set({ notificationsLastSeenAt: timestamp })
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)));
}
