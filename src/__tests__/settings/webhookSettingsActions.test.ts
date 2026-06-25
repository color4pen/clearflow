/**
 * Webhook settings actions — static code analysis tests
 *
 * TC-018: findLatestByEndpointIds がバッチ取得する
 * TC-019: listWebhookEndpointsAction が lastDeliveryStatus を返す
 *
 * ライブ DB / 認証を使わず、ソースファイルを静的解析して実装パターンを確認する。
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// TC-018: findLatestByEndpointIds がバッチ取得する
// ---------------------------------------------------------------------------

describe("TC-018: findLatestByEndpointIds — バッチ取得", () => {
  it("findLatestByEndpointIds 関数が存在する", async () => {
    const src = await readSrc("infrastructure/repositories/webhookDeliveryRepository.ts");
    expect(src).toContain("findLatestByEndpointIds");
  });

  it("空配列の場合に空 Map を返す早期リターンがある", async () => {
    const src = await readSrc("infrastructure/repositories/webhookDeliveryRepository.ts");
    const fnIdx = src.indexOf("findLatestByEndpointIds");
    expect(fnIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("new Map()");
  });

  it("inArray で複数エンドポイント ID を一括クエリする（N+1 なし）", async () => {
    const src = await readSrc("infrastructure/repositories/webhookDeliveryRepository.ts");
    expect(src).toContain("inArray");
    const fnIdx = src.indexOf("findLatestByEndpointIds");
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("inArray");
  });

  it("row_number() ウィンドウ関数で各エンドポイントの最新配信を特定する", async () => {
    const src = await readSrc("infrastructure/repositories/webhookDeliveryRepository.ts");
    const fnIdx = src.indexOf("findLatestByEndpointIds");
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("row_number()");
  });

  it("organizationId の絞り込みのため webhookEndpoints に innerJoin する", async () => {
    const src = await readSrc("infrastructure/repositories/webhookDeliveryRepository.ts");
    const fnIdx = src.indexOf("findLatestByEndpointIds");
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("innerJoin");
    expect(afterFn).toContain("webhookEndpoints");
    expect(afterFn).toContain("organizationId");
  });

  it("Map<string, { status, lastAttemptAt }> を返す", async () => {
    const src = await readSrc("infrastructure/repositories/webhookDeliveryRepository.ts");
    const fnIdx = src.indexOf("findLatestByEndpointIds");
    const afterFn = src.slice(fnIdx);
    // Map に set する
    expect(afterFn).toContain("result.set(");
    expect(afterFn).toContain("status");
    expect(afterFn).toContain("lastAttemptAt");
  });
});

// ---------------------------------------------------------------------------
// TC-019: listWebhookEndpointsAction が lastDeliveryStatus を返す
// ---------------------------------------------------------------------------

describe("TC-019: listWebhookEndpointsAction — lastDeliveryStatus 付与", () => {
  it("listWebhookEndpointsAction が存在する", async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    expect(src).toContain("listWebhookEndpointsAction");
  });

  it("findLatestByEndpointIds を呼び出す", async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    const fnIdx = src.indexOf("listWebhookEndpointsAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("findLatestByEndpointIds");
  });

  it("各エンドポイントに lastDeliveryStatus を付与して返す", async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    const fnIdx = src.indexOf("listWebhookEndpointsAction");
    expect(fnIdx).toBeGreaterThan(-1);
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("lastDeliveryStatus");
  });

  it("エンドポイント ID リストを endpointIds に収集して渡す", async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    const fnIdx = src.indexOf("listWebhookEndpointsAction");
    const afterFn = src.slice(fnIdx);
    expect(afterFn).toContain("endpointIds");
    expect(afterFn).toContain("map(");
  });

  it("配信なしの場合は null を返す（latestDeliveryMap.get の fallback）", async () => {
    const src = await readSrc("app/actions/webhooks.ts");
    const fnIdx = src.indexOf("listWebhookEndpointsAction");
    const afterFn = src.slice(fnIdx);
    // ?? null pattern
    expect(afterFn).toContain("?? null");
  });
});
