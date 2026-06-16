import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { organizations } from "../schema";
import type { Organization } from "@/domain/models/organization";

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
