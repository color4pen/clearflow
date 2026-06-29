import bcrypt from "bcryptjs";
import { organizationRepository, userRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";
import type { Organization } from "@/domain/models/organization";
import type { User } from "@/domain/models/user";

export type ProvisionOrganizationResult =
  | { ok: true; organization: Organization; adminUser: User }
  | { ok: false; reason: string };

export async function provisionOrganization(data: {
  actorId: string;
  organizationName: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
}): Promise<ProvisionOrganizationResult> {
  // Email uniqueness pre-check
  const emailTaken = await userRepository.existsByEmail(data.adminEmail);
  if (emailTaken) {
    return { ok: false, reason: "このメールアドレスは既に使用されています" };
  }

  const hashedPassword = await bcrypt.hash(data.adminPassword, 12);

  try {
    let createdOrganization: Organization | undefined;
    let createdAdminUser: User | undefined;

    await db.transaction(async (tx) => {
      createdOrganization = await organizationRepository.create(
        { name: data.organizationName },
        tx
      );

      createdAdminUser = await userRepository.create(
        {
          organizationId: createdOrganization.id,
          email: data.adminEmail,
          name: data.adminName,
          role: "admin",
          hashedPassword,
        },
        tx
      );

      await recordAudit(
        {
          action: "organization.create",
          targetType: "organization",
          targetId: createdOrganization.id,
          actorId: data.actorId,
          organizationId: createdOrganization.id,
        },
        tx
      );
    });

    return {
      ok: true,
      organization: createdOrganization!,
      adminUser: createdAdminUser!,
    };
  } catch (err) {
    // PostgreSQL UNIQUE constraint violation
    if ((err as { code?: string }).code === "23505") {
      return { ok: false, reason: "このメールアドレスは既に使用されています" };
    }
    console.error("[provisionOrganization] unexpected error:", err);
    return { ok: false, reason: "組織の作成に失敗しました" };
  }
}
