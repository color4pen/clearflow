import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP ツール結果のエラー変換ユーティリティ。
 * スタックトレース・内部識別子をクライアントに漏らさない。
 */

export function toToolError(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

export function toToolSuccess(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * 予期しない例外を安全なエラーメッセージに変換する。
 * スタックトレース・ファイルパス・DB エラー詳細は含めない。
 */
export function handleToolError(error: unknown): CallToolResult {
  if (error instanceof Error) {
    // Zod parse エラーのフィールドメッセージを抽出する
    const zodErrors = extractZodErrors(error);
    if (zodErrors) {
      return toToolError(zodErrors);
    }
  }
  return toToolError("内部エラーが発生しました");
}

/**
 * Zod バリデーションエラーからフィールド別メッセージを抽出する。
 * Zod エラーでない場合は null を返す。
 */
function extractZodErrors(error: Error): string | null {
  // Zod v4 エラーの構造を確認
  if ("issues" in error && Array.isArray((error as { issues: unknown }).issues)) {
    const issues = (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
    const messages = issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") + ": " : "";
      return `${path}${issue.message}`;
    });
    return messages.join(", ");
  }
  return null;
}
