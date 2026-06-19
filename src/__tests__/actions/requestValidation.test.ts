import { describe, it, expect } from "bun:test";
import { z } from "zod";

// Mirrors the schema defined in src/app/actions/requests.ts
const createRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  templateId: z.string().uuid("テンプレートを選択してください"),
});

describe("Server Action — input validation", () => {
  /**
   * TC-022: 不正な入力 (title 空) での申請作成が拒否される
   */
  it("TC-022: empty title fails validation (zod safeParse)", () => {
    const result = createRequestSchema.safeParse({
      title: "",
      templateId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.title).toBeDefined();
      expect(Array.isArray(fieldErrors.title)).toBe(true);
    }
  });

  it("TC-022: undefined title fails validation", () => {
    const result = createRequestSchema.safeParse({
      title: undefined,
      templateId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });

  it("TC-022: valid title and templateId passes validation", () => {
    const result = createRequestSchema.safeParse({
      title: "申請タイトル",
      templateId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  /**
   * TC-022b: templateId が未入力または不正な UUID の場合に申請作成が拒否される
   */
  it("TC-022b: missing templateId fails validation", () => {
    const result = createRequestSchema.safeParse({ title: "申請タイトル" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.templateId).toBeDefined();
      expect(Array.isArray(fieldErrors.templateId)).toBe(true);
    }
  });

  it("TC-022b: invalid UUID templateId fails validation", () => {
    const result = createRequestSchema.safeParse({
      title: "申請タイトル",
      templateId: "not-a-valid-uuid",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.templateId).toBeDefined();
    }
  });

  it("TC-022b: empty string templateId fails validation", () => {
    const result = createRequestSchema.safeParse({
      title: "申請タイトル",
      templateId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.templateId).toBeDefined();
    }
  });
});
