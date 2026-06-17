/**
 * Webhook signature tests
 *
 * Verifies that computeSignature produces a valid HMAC-SHA256 signature
 * matching the expected crypto output.
 */

import { describe, it, expect } from "bun:test";
import { createHmac } from "crypto";
import { computeSignature } from "@/infrastructure/webhookDelivery";

describe("computeSignature", () => {
  it("generates correct HMAC-SHA256 signature for known input", () => {
    const secret = "test_secret";
    const payload = '{"event":"test"}';

    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const actual = computeSignature(secret, payload);

    expect(actual).toBe(expected);
  });

  it("generates correct HMAC-SHA256 signature for request.approved event", () => {
    const secret = "test_secret";
    const payload = '{"event":"request.approved"}';

    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const actual = computeSignature(secret, payload);

    expect(actual).toBe(expected);
  });

  it("produces a 64-character hex string", () => {
    const sig = computeSignature("secret", "payload");
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different signatures for different secrets", () => {
    const payload = '{"event":"test"}';
    const sig1 = computeSignature("secret1", payload);
    const sig2 = computeSignature("secret2", payload);
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different payloads", () => {
    const secret = "my_secret";
    const sig1 = computeSignature(secret, '{"event":"request.created"}');
    const sig2 = computeSignature(secret, '{"event":"request.approved"}');
    expect(sig1).not.toBe(sig2);
  });
});
