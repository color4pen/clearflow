import { z } from "zod";

export const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^169\.254\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
];

/**
 * ホスト名が内部ネットワーク（ループバック・プライベート・リンクローカル）を指すか判定する。
 * 文字列ベースの検査であり、配信時の DNS 解決・リダイレクトは別途 pin する必要がある
 * （DNS リバインディング・リダイレクト SSRF はこの関数では防げない。webhook 配信層の課題）。
 */
export function isPrivateHost(hostname: string): boolean {
  // IPv6 のブラケットを除去して正規化する（URL.hostname は "[::1]" のように括弧を含む）
  const host = hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();

  // IPv6 リテラル
  if (host.includes(":")) {
    if (host === "::1" || host === "::") return true; // ループバック / 未指定
    if (host.startsWith("fe80:")) return true; // リンクローカル
    if (/^f[cd][0-9a-f]{2}:/.test(host) || host.startsWith("fc:") || host.startsWith("fd:")) {
      return true; // ユニークローカル fc00::/7
    }
    return false;
  }

  // 非標準エンコードの IPv4（10 進 "2130706433"・16 進 "0x7f000001"）は
  // 正当な DNS ホスト名ではなく、OS リゾルバが内部 IP に解決しうるため拒否する
  if (/^\d+$/.test(host)) return true;
  if (/^0x[0-9a-f]+$/i.test(host)) return true;

  // 標準ドット区切り IPv4 のプライベートレンジ
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(host));
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
