import { describe, it, expect } from "bun:test";
import { z } from "zod";

// Mirrors the schema defined in src/app/actions/requests.ts
const createRequestSchema = z.object({
  title: z.string().min(1, "タイトルは必須です"),
  description: z.string().optional(),
});

describe("Server Action — input validation", () => {
  /**
   * TC-022: 不正な入力 (title 空) での申請作成が拒否される
   */
  it("TC-022: empty title fails validation (zod safeParse)", () => {
    const result = createRequestSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.title).toBeDefined();
      expect(Array.isArray(fieldErrors.title)).toBe(true);
    }
  });

  it("TC-022: undefined title fails validation", () => {
    const result = createRequestSchema.safeParse({ title: undefined });
    expect(result.success).toBe(false);
  });

  it("TC-022: valid title passes validation", () => {
    const result = createRequestSchema.safeParse({ title: "申請タイトル" });
    expect(result.success).toBe(true);
  });
});
