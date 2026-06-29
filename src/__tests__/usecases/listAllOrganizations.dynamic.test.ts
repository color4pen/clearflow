/**
 * listAllOrganizations usecase の動的テスト。
 * 個別ファイルモックで organizationRepository をモックし、
 * usecase がリポジトリの結果をそのまま返すことを検証する。
 */

import { describe, it, expect, beforeEach, mock } from "bun:test";
import type { Organization } from "@/domain/models/organization";

// ---------------------------------------------------------------------------
// モック状態
// ---------------------------------------------------------------------------

const state = {
  organizations: [] as Organization[],
};

// ---------------------------------------------------------------------------
// モジュールモック（個別ファイル）
// ---------------------------------------------------------------------------

mock.module("@/infrastructure/repositories/organizationRepository", () => ({
  findAll: async () => state.organizations,
  create: async () => { throw new Error("not implemented in this test"); },
  findById: async () => null,
  update: async () => null,
}));

import { listAllOrganizations } from "@/application/usecases/listAllOrganizations";

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

const orgA: Organization = {
  id: "org-001",
  name: "組織 A",
  createdAt: new Date("2026-01-01"),
};

const orgB: Organization = {
  id: "org-002",
  name: "組織 B",
  createdAt: new Date("2026-02-01"),
};

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe("listAllOrganizations usecase", () => {
  beforeEach(() => {
    state.organizations = [];
  });

  it("findAll が返す組織一覧がそのまま返される", async () => {
    state.organizations = [orgA, orgB];

    const result = await listAllOrganizations();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("org-001");
    expect(result[0].name).toBe("組織 A");
    expect(result[1].id).toBe("org-002");
    expect(result[1].name).toBe("組織 B");
  });

  it("組織が存在しない場合は空配列を返す", async () => {
    state.organizations = [];

    const result = await listAllOrganizations();

    expect(result).toHaveLength(0);
  });

  it("返される各組織に id / name / createdAt が含まれる", async () => {
    state.organizations = [orgA];

    const result = await listAllOrganizations();

    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("createdAt");
  });
});
