import { userRepository } from "@/infrastructure/repositories";

export type UpdateOwnProfileResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function updateOwnProfile(data: {
  userId: string;
  organizationId: string;
  name: string;
}): Promise<UpdateOwnProfileResult> {
  const updated = await userRepository.updateProfile(
    data.userId,
    data.organizationId,
    { name: data.name }
  );

  if (!updated) {
    return { ok: false, reason: "ユーザーが見つかりません" };
  }

  return { ok: true };
}
