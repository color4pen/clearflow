import { describe, it, expect } from "bun:test";
import { canPerform } from "@/domain/authorization";

describe("revenue 認可マトリクス", () => {
  /**
   * TC-016: 全ロールが revenue.view を実行できる
   */
  describe("revenue.view", () => {
    it("member が revenue.view を実行できる", () => {
      expect(canPerform("member", "revenue", "view")).toBe(true);
    });

    it("finance が revenue.view を実行できる", () => {
      expect(canPerform("finance", "revenue", "view")).toBe(true);
    });

    it("manager が revenue.view を実行できる", () => {
      expect(canPerform("manager", "revenue", "view")).toBe(true);
    });

    it("admin が revenue.view を実行できる", () => {
      expect(canPerform("admin", "revenue", "view")).toBe(true);
    });
  });

  /**
   * TC-017: admin と manager のみが revenue.setTarget を実行できる
   */
  describe("revenue.setTarget", () => {
    it("admin が revenue.setTarget を実行できる", () => {
      expect(canPerform("admin", "revenue", "setTarget")).toBe(true);
    });

    it("manager が revenue.setTarget を実行できる", () => {
      expect(canPerform("manager", "revenue", "setTarget")).toBe(true);
    });

    it("finance は revenue.setTarget を実行できない (TC-014)", () => {
      expect(canPerform("finance", "revenue", "setTarget")).toBe(false);
    });

    it("member は revenue.setTarget を実行できない", () => {
      expect(canPerform("member", "revenue", "setTarget")).toBe(false);
    });
  });

  /**
   * TC-015: finance ロールは CSV エクスポート可能
   * TC-018: member は revenue.export を実行できない
   */
  describe("revenue.export", () => {
    it("admin が revenue.export を実行できる", () => {
      expect(canPerform("admin", "revenue", "export")).toBe(true);
    });

    it("manager が revenue.export を実行できる", () => {
      expect(canPerform("manager", "revenue", "export")).toBe(true);
    });

    it("finance が revenue.export を実行できる (TC-015)", () => {
      expect(canPerform("finance", "revenue", "export")).toBe(true);
    });

    it("member は revenue.export を実行できない (TC-018)", () => {
      expect(canPerform("member", "revenue", "export")).toBe(false);
    });
  });
});
