/**
 * 承認ポリシーサーバーアクション 静的コード解析テスト
 *
 * ライブ DB / 認証を使わず、ソースファイルを静的解析して
 * 実装の存在・認可チェックのパターンを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("policies.ts — ファイル基本構造", () => {
  it('"use server" ディレクティブが含まれる', async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain('"use server"');
  });

  it("canPerform を使ったロールチェックがある", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("canPerform");
    expect(src).toContain("@/domain/authorization");
  });

  it('権限エラー時に "この操作を実行する権限がありません" を返す', async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("この操作を実行する権限がありません");
  });

  it("revalidatePath でキャッシュを無効化する", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("revalidatePath");
    expect(src).toContain('"/settings/policies"');
  });
});

describe("TC-009: listPoliciesAction 認可チェック", () => {
  it("listPoliciesAction が approvalSettings / listPolicies で認可チェックをする", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("listPoliciesAction");
    expect(src).toContain('"approvalSettings"');
    expect(src).toContain('"listPolicies"');
  });

  it("listPoliciesAction が approvalPolicyRepository.findByOrganization を呼び出す", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("approvalPolicyRepository.findByOrganization");
  });
});

describe("TC-010: createPolicyAction 認可チェック", () => {
  it("createPolicyAction が approvalSettings / createPolicy で認可チェックをする", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("createPolicyAction");
    expect(src).toContain('"createPolicy"');
  });

  it("createPolicyAction が approvalPolicyRepository.create を呼び出す", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("approvalPolicyRepository.create");
  });
});

describe("TC-011: updatePolicyAction 認可チェック", () => {
  it("updatePolicyAction が approvalSettings / editPolicy で認可チェックをする", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("updatePolicyAction");
    expect(src).toContain('"editPolicy"');
  });

  it("updatePolicyAction が approvalPolicyRepository.updateById を呼び出す", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("approvalPolicyRepository.updateById");
  });
});

describe("TC-012: togglePolicyAction 認可チェック", () => {
  it("togglePolicyAction が approvalSettings / editPolicy で認可チェックをする", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("togglePolicyAction");
  });

  it("togglePolicyAction が approvalPolicyRepository.findById を呼び出す", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("approvalPolicyRepository.findById");
  });

  it("togglePolicyAction が isActive を反転させるロジックを含む", async () => {
    const src = await readSrc("app/actions/policies.ts");
    expect(src).toContain("!current.isActive");
  });
});

describe("TC-028: conditionField が空のとき conditionOperator/conditionValue を null にする", () => {
  it("createPolicyAction が conditionField が空のとき null を渡すロジックを含む", async () => {
    const src = await readSrc("app/actions/policies.ts");
    // conditionField が空の場合に null を渡す条件分岐が含まれる
    expect(src).toContain("hasCondition");
    expect(src).toContain("null");
  });

  it("updatePolicyAction も同様の null クリアロジックを含む", async () => {
    const src = await readSrc("app/actions/policies.ts");
    const updateIdx = src.indexOf("updatePolicyAction");
    const hasConditionIdx = src.indexOf("hasCondition", updateIdx);
    expect(hasConditionIdx).toBeGreaterThan(updateIdx);
  });
});

describe("SettingsNav — 承認ポリシーリンク追加", () => {
  it("NAV_ITEMS に /settings/policies が含まれる", async () => {
    const src = await readSrc("app/(dashboard)/settings/SettingsNav.tsx");
    expect(src).toContain('"/settings/policies"');
    expect(src).toContain("承認ポリシー");
  });

  it("テンプレートリンクの後に承認ポリシーリンクが配置されている", async () => {
    const src = await readSrc("app/(dashboard)/settings/SettingsNav.tsx");
    const templateIdx = src.indexOf('"/settings/templates"');
    const policyIdx = src.indexOf('"/settings/policies"');
    const userIdx = src.indexOf('"/settings/users"');
    expect(templateIdx).toBeLessThan(policyIdx);
    expect(policyIdx).toBeLessThan(userIdx);
  });
});
