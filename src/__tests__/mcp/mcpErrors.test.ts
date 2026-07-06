/**
 * T-06: エラー変換ユーティリティのテスト
 * TC-038, TC-039, TC-040
 */

import { describe, it, expect } from "bun:test";
import { toToolError, toToolSuccess, handleToolError } from "../../app/api/mcp/errors";

describe("MCP エラー変換ユーティリティ", () => {
  describe("TC-038: toToolError が正しい MCP ツール結果を返す", () => {
    it("isError: true の結果を返す", () => {
      const result = toToolError("権限がありません");
      expect(result.isError).toBe(true);
    });

    it("content に text タイプのメッセージを含む", () => {
      const result = toToolError("権限がありません");
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({ type: "text", text: "権限がありません" });
    });

    it("指定したメッセージがそのまま返る", () => {
      const message = "テストエラーメッセージ";
      const result = toToolError(message);
      expect((result.content[0] as { type: string; text: string }).text).toBe(message);
    });
  });

  describe("TC-039: toToolSuccess が正しい MCP ツール結果を返す", () => {
    it("isError が undefined（truthy ではない）", () => {
      const result = toToolSuccess({ id: "123", title: "引合A" });
      expect(result.isError).toBeUndefined();
    });

    it("content に JSON.stringify されたデータを含む", () => {
      const data = { id: "123", title: "引合A" };
      const result = toToolSuccess(data);
      expect(result.content).toHaveLength(1);
      expect((result.content[0] as { type: string; text: string }).text).toBe(
        JSON.stringify(data, null, 2)
      );
    });

    it("配列データも正しく変換される", () => {
      const data = [{ id: "1" }, { id: "2" }];
      const result = toToolSuccess(data);
      expect((result.content[0] as { type: string; text: string }).text).toBe(
        JSON.stringify(data, null, 2)
      );
    });
  });

  describe("TC-040: handleToolError がスタックトレースを含まない安全なエラーを返す", () => {
    it("isError: true の結果を返す", () => {
      const error = new Error("DB connection failed");
      const result = handleToolError(error);
      expect(result.isError).toBe(true);
    });

    it("スタックトレースを含まない", () => {
      const error = new Error("DB connection failed with stack at file.ts:123");
      const result = handleToolError(error);
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).not.toContain("at file.ts");
      expect(text).not.toContain("DB connection failed");
    });

    it("汎用エラーメッセージを返す", () => {
      const error = new Error("Internal server error with sensitive info");
      const result = handleToolError(error);
      const text = (result.content[0] as { type: string; text: string }).text;
      expect(text).toBe("内部エラーが発生しました");
    });

    it("非 Error オブジェクトも処理できる", () => {
      const result = handleToolError("string error");
      expect(result.isError).toBe(true);
    });

    it("null も処理できる", () => {
      const result = handleToolError(null);
      expect(result.isError).toBe(true);
    });
  });
});
