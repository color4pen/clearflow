import { z } from "zod";

export const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^::1$/,
  /^169\.254\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
];

export function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
}

export function validateWebhookUrl(
  url: string
): { ok: true } | { ok: false; message: string } {
  const urlResult = z.string().url().safeParse(url);
  if (!urlResult.success) {
    return { ok: false, message: "有効な URL を入力してください" };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: "有効な URL を入力してください" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, message: "内部ネットワークの URL は登録できません" };
  }

  if (isPrivateHost(parsed.hostname)) {
    return { ok: false, message: "内部ネットワークの URL は登録できません" };
  }

  return { ok: true };
}
