import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { approvalTemplates } from "../schema";
import type { ApprovalTemplate, ApprovalTemplateStep } from "@/domain/models/approvalTemplate";

function mapRow(row: typeof approvalTemplates.$inferSelect): ApprovalTemplate {
  return {
    id: row.id,
    name: row.name,
    organizationId: row.organizationId,
    steps: row.steps as ApprovalTemplateStep[],
    createdAt: row.createdAt,
  };
}

export async function findByOrganization(
  organizationId: string
): Promise<ApprovalTemplate[]> {
  const result = await db
    .select()
    .from(approvalTemplates)
    .where(eq(approvalTemplates.organizationId, organizationId));
  return result.map(mapRow);
}

export async function findById(
  id: string,
  organizationId: string
): Promise<ApprovalTemplate | null> {
  const result = await db
    .select()
    .from(approvalTemplates)
    .where(
      and(
        eq(approvalTemplates.id, id),
        eq(approvalTemplates.organizationId, organizationId)
      )
    )
    .limit(1);
  return result[0] ? mapRow(result[0]) : null;
}
