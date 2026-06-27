/**
 * Approval delegation usecase tests — static code analysis
 *
 * These tests verify that the usecase implementation contains the required
 * patterns for approval delegation: self-delegation check, cross-org check,
 * overlap check, TX-internal delegation fetch, canApproveWithDelegation usage,
 * and delegatedFrom metadata recording.
 */

import { describe, it, expect } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

describe("createDelegation usecase — static analysis", () => {
  it("contains self-delegation check (fromUserId === toUserId)", async () => {
    const src = await readSrc("application/usecases/createDelegation.ts");
    // Must check for self-delegation (data.fromUserId === data.toUserId)
    expect(src).toContain("fromUserId");
    expect(src).toContain("toUserId");
    // Verify both the check and rejection path exist
    expect(src).toContain("自己委譲");
  });

  it("contains cross-org check via userRepository.findById", async () => {
    const src = await readSrc("application/usecases/createDelegation.ts");
    // Must import and call userRepository.findById for both users
    expect(src).toContain("userRepository");
    expect(src).toContain("findById");
    expect(src).toContain("organizationId");
  });

  it("contains findOverlapping call for duplicate delegation check", async () => {
    const src = await readSrc("application/usecases/createDelegation.ts");
    expect(src).toContain("findOverlapping");
  });

  it("records audit log on success", async () => {
    const src = await readSrc("application/usecases/createDelegation.ts");
    expect(src).toContain("recordAudit");
    expect(src).toContain("delegation.create");
  });
});

describe("approveRequest usecase — delegation integration static analysis", () => {
  it("contains findActiveByToUserId call", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("findActiveByToUserId");
  });

  it("contains findActiveByToUserId call inside db.transaction callback", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    // The transaction callback must contain findActiveByToUserId (TOCTOU防止)
    const txIdx = src.indexOf("db.transaction");
    expect(txIdx).toBeGreaterThan(-1);
    // Find the second occurrence of findActiveByToUserId (inside TX)
    const firstOccurrence = src.indexOf("findActiveByToUserId");
    const secondOccurrence = src.indexOf("findActiveByToUserId", firstOccurrence + 1);
    expect(secondOccurrence).toBeGreaterThan(-1);
    // The second occurrence must be after db.transaction
    expect(secondOccurrence).toBeGreaterThan(txIdx);
  });

  it("contains canApproveWithDelegation call", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("canApproveWithDelegation");
  });

  it("records delegatedFrom in audit metadata when delegation is used", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("delegatedFrom");
  });

  it("imports approvalDelegationRepository", async () => {
    const src = await readSrc("application/usecases/approveRequest.ts");
    expect(src).toContain("approvalDelegationRepository");
  });
});

describe("deactivateDelegation usecase — static analysis", () => {
  it("calls approvalDelegationRepository.update with isActive: false", async () => {
    const src = await readSrc("application/usecases/deactivateDelegation.ts");
    expect(src).toContain("approvalDelegationRepository");
    expect(src).toContain("update");
    expect(src).toContain("isActive: false");
  });

  it("returns { ok: false } when delegation not found", async () => {
    const src = await readSrc("application/usecases/deactivateDelegation.ts");
    expect(src).toContain("Delegation not found");
  });

  it("records audit log on success", async () => {
    const src = await readSrc("application/usecases/deactivateDelegation.ts");
    expect(src).toContain("recordAudit");
    expect(src).toContain("delegation.deactivate");
  });
});
