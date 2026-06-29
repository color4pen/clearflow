import bcrypt from "bcryptjs";
import { userRepository } from "@/infrastructure/repositories";
import { recordAudit } from "@/application/services/auditRecorder";
import { db } from "@/infrastructure/db";
import type { Role } from "@/domain/models/user";
import type { User } from "@/domain/models/user";

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; reason: string };

export async function createUser(data: {
  organizationId: string;
  actorId: string;
  email: string;
  name: string;
  role: Role;
  password: string;
}): Promise<CreateUserResult> {
  // Email uniqueness pre-check (includes deactivated users — email is still reserved)
  const emailTaken = await userRepository.existsByEmail(data.email);
  if (emailTaken) {
    return { ok: false, reason: "このメールアドレスは既に使用されています" };
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  try {
    let createdUser: User | undefined;

    await db.transaction(async (tx) => {
      createdUser = await userRepository.create(
        {
          organizationId: data.organizationId,
          email: data.email,
          name: data.name,
          role: data.role,
          hashedPassword,
        },
        tx
      );

      await recordAudit(
        {
          action: "user.create",
          targetType: "user",
          targetId: createdUser.id,
          actorId: data.actorId,
          organizationId: data.organizationId,
        },
        tx
      );
    });

    return { ok: true, user: createdUser! };
  } catch (err) {
    // PostgreSQL UNIQUE constraint violation
    if ((err as { code?: string }).code === "23505") {
      return { ok: false, reason: "このメールアドレスは既に使用されています" };
    }
    console.error("[createUser] unexpected error:", err);
    return { ok: false, reason: "ユーザーの作成に失敗しました" };
  }
}
