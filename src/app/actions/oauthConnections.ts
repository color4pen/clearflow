"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/infrastructure/auth";
import { listOAuthConnections, type OAuthConnection } from "@/application/usecases/listOAuthConnections";
import { revokeOAuthConnection } from "@/application/usecases/revokeOAuthConnection";

// --- listOAuthConnectionsAction ---

export type ListOAuthConnectionsResult =
  | { success: false; message: string }
  | { success: true; connections: OAuthConnection[] };

export async function listOAuthConnectionsAction(): Promise<ListOAuthConnectionsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  const connections = await listOAuthConnections({
    userId: session.user.id,
    organizationId: session.user.organizationId,
  });

  return { success: true, connections };
}

// --- revokeOAuthConnectionAction ---

export type RevokeOAuthConnectionResult =
  | { success: false; message: string }
  | { success: true };

export async function revokeOAuthConnectionAction(
  clientId: string
): Promise<RevokeOAuthConnectionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "認証が必要です" };
  }

  if (!clientId || typeof clientId !== "string") {
    return { success: false, message: "無効なクライアント ID です" };
  }

  const result = await revokeOAuthConnection({
    userId: session.user.id,
    organizationId: session.user.organizationId,
    clientId,
  });

  if (!result.ok) {
    return { success: false, message: result.reason };
  }

  revalidatePath("/account");
  return { success: true };
}
