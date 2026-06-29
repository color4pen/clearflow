import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { isSuperAdmin } from "@/domain/services/superAdmin";

describe("isSuperAdmin", () => {
  const originalEnv = process.env.SUPER_ADMIN_EMAILS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.SUPER_ADMIN_EMAILS;
    } else {
      process.env.SUPER_ADMIN_EMAILS = originalEnv;
    }
  });

  it("登録済みメールアドレスに true を返す", () => {
    process.env.SUPER_ADMIN_EMAILS = "admin@example.com,ops@example.com";
    expect(isSuperAdmin("admin@example.com")).toBe(true);
    expect(isSuperAdmin("ops@example.com")).toBe(true);
  });

  it("大文字小文字を区別せず true を返す（入力が小文字・env が大文字）", () => {
    process.env.SUPER_ADMIN_EMAILS = "Admin@Example.COM";
    expect(isSuperAdmin("admin@example.com")).toBe(true);
  });

  it("大文字小文字を区別せず true を返す（入力が大文字・env が小文字）", () => {
    process.env.SUPER_ADMIN_EMAILS = "admin@example.com";
    expect(isSuperAdmin("ADMIN@EXAMPLE.COM")).toBe(true);
  });

  it("未登録メールアドレスに false を返す", () => {
    process.env.SUPER_ADMIN_EMAILS = "admin@example.com";
    expect(isSuperAdmin("other@example.com")).toBe(false);
  });

  it("env 未設定の場合は false を返す", () => {
    delete process.env.SUPER_ADMIN_EMAILS;
    expect(isSuperAdmin("anyone@example.com")).toBe(false);
  });

  it("env が空文字列の場合は false を返す", () => {
    process.env.SUPER_ADMIN_EMAILS = "";
    expect(isSuperAdmin("anyone@example.com")).toBe(false);
  });

  it("env がスペースのみの場合は false を返す", () => {
    process.env.SUPER_ADMIN_EMAILS = "   ";
    expect(isSuperAdmin("anyone@example.com")).toBe(false);
  });

  it("null 入力に false を返す", () => {
    process.env.SUPER_ADMIN_EMAILS = "admin@example.com";
    expect(isSuperAdmin(null)).toBe(false);
  });

  it("undefined 入力に false を返す", () => {
    process.env.SUPER_ADMIN_EMAILS = "admin@example.com";
    expect(isSuperAdmin(undefined)).toBe(false);
  });

  it("複数メール登録（カンマ区切り）で各メールに true を返す", () => {
    process.env.SUPER_ADMIN_EMAILS = "a@example.com,b@example.com,c@example.com";
    expect(isSuperAdmin("a@example.com")).toBe(true);
    expect(isSuperAdmin("b@example.com")).toBe(true);
    expect(isSuperAdmin("c@example.com")).toBe(true);
  });

  it("前後のスペースを trim して判定する", () => {
    process.env.SUPER_ADMIN_EMAILS = " admin@example.com , ops@example.com ";
    expect(isSuperAdmin("admin@example.com")).toBe(true);
    expect(isSuperAdmin("ops@example.com")).toBe(true);
  });

  it("リスト内にあるが空エントリは無視される", () => {
    process.env.SUPER_ADMIN_EMAILS = "admin@example.com,,ops@example.com";
    expect(isSuperAdmin("admin@example.com")).toBe(true);
    expect(isSuperAdmin("ops@example.com")).toBe(true);
    // 空文字列はスーパー管理者と一致しない
    expect(isSuperAdmin("")).toBe(false);
  });
});
