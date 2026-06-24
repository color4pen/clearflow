/**
 * ダッシュボード画面で使用する純粋関数ユーティリティ
 */

/**
 * 指定した Date から現在までの経過時間を日本語の相対時間文字列に変換する。
 *
 * - 1 分未満: "たった今"
 * - 1 分以上 60 分未満: "N分前"
 * - 1 時間以上 24 時間未満: "N時間前"
 * - 24 時間以上: "N日前"
 */
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}時間前`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}日前`;
}
