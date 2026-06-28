/**
 * userRepository アカウント設定関連メソッド — 静的コード解析テスト
 *
 * 以下を検証する:
 * - findByIdForAuth が存在し organizationId で WHERE 条件を持つ
 * - findById の select に hashedPassword が含まれない（安全 projection 維持）
 * - updateProfile が WHERE に id と organizationId の両方を含む
 * - updatePassword が WHERE に id と organizationId の両方を含む
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("userRepository — findByIdForAuth", () => {
  it("findByIdForAuth が userRepository.ts に存在する", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    expect(src).toContain("findByIdForAuth");
  });

  it("findByIdForAuth のシグネチャに organizationId が含まれる", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function findByIdForAuth(");
    expect(idx).toBeGreaterThan(-1);
    const signature = src.slice(idx, idx + 200);
    expect(signature).toContain("organizationId");
  });

  it("findByIdForAuth の WHERE 条件に organizationId が含まれる", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function findByIdForAuth(");
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, idx + 500);
    expect(body).toContain("organizationId");
    expect(body).toContain("id");
  });

  it("findByIdForAuth が hashedPassword を返す（UserWithPassword）", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function findByIdForAuth(");
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, idx + 600);
    expect(body).toContain("hashedPassword");
  });
});

describe("userRepository — findById 安全 projection 維持", () => {
  it("findById の select に hashedPassword が含まれない", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function findById(");
    expect(idx).toBeGreaterThan(-1);
    // findById の本体（次の export まで）を切り出す
    const nextExportIdx = src.indexOf("export async function", idx + 1);
    const body = src.slice(idx, nextExportIdx > -1 ? nextExportIdx : idx + 1000);
    expect(body).not.toContain("hashedPassword");
  });
});

describe("userRepository — updateProfile", () => {
  it("updateProfile が userRepository.ts に存在する", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    expect(src).toContain("updateProfile");
  });

  it("updateProfile の WHERE 条件に id が含まれる", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function updateProfile(");
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, idx + 600);
    expect(body).toContain("users.id");
  });

  it("updateProfile の WHERE 条件に organizationId が含まれる", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function updateProfile(");
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, idx + 600);
    expect(body).toContain("organizationId");
  });

  it("updateProfile の returning に hashedPassword が含まれない（安全 projection）", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function updateProfile(");
    expect(idx).toBeGreaterThan(-1);
    const nextIdx = src.indexOf("export async function", idx + 1);
    const body = src.slice(idx, nextIdx > -1 ? nextIdx : idx + 1000);
    const returningIdx = body.indexOf(".returning(");
    expect(returningIdx).toBeGreaterThan(-1);
    const returningSection = body.slice(returningIdx, returningIdx + 400);
    expect(returningSection).not.toContain("hashedPassword");
  });
});

describe("userRepository — updatePassword", () => {
  it("updatePassword が userRepository.ts に存在する", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    expect(src).toContain("updatePassword");
  });

  it("updatePassword の WHERE 条件に id が含まれる", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function updatePassword(");
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, idx + 600);
    expect(body).toContain("users.id");
  });

  it("updatePassword の WHERE 条件に organizationId が含まれる", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function updatePassword(");
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, idx + 600);
    expect(body).toContain("organizationId");
  });

  it("updatePassword が boolean を返す（result.length > 0）", async () => {
    const src = await readSrc("infrastructure/repositories/userRepository.ts");
    const idx = src.indexOf("export async function updatePassword(");
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, idx + 600);
    expect(body).toContain("result.length > 0");
  });
});
