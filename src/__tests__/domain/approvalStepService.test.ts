import { describe, it, expect } from "bun:test";
import {
  getCurrentStep,
  isAllApproved,
  getStepsToReset,
  canApprove,
  isStepExpired,
} from "@/domain/services/approvalStepService";
import type { ApprovalStep } from "@/domain/models/approvalStep";

function makeStep(
  overrides: Partial<ApprovalStep> & {
    stepOrder: number;
    status: ApprovalStep["status"];
  }
): ApprovalStep {
  return {
    id: `step-${overrides.stepOrder}`,
    requestId: "req-1",
    stepOrder: overrides.stepOrder,
    approverRole: "admin",
    status: overrides.status,
    approvedBy: null,
    approvedByName: null,
    approvedAt: null,
    comment: null,
    organizationId: "org-1",
    version: 1,
    deadline: null,
    ...overrides,
  };
}

describe("approvalStepService — getCurrentStep", () => {
  it("returns the pending step with the smallest stepOrder", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "approved" }),
      makeStep({ stepOrder: 2, status: "pending" }),
      makeStep({ stepOrder: 3, status: "pending" }),
    ];
    const current = getCurrentStep(steps);
    expect(current).not.toBeNull();
    expect(current?.stepOrder).toBe(2);
  });

  it("returns null when all steps are approved", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "approved" }),
      makeStep({ stepOrder: 2, status: "approved" }),
    ];
    const current = getCurrentStep(steps);
    expect(current).toBeNull();
  });

  it("returns null for an empty array", () => {
    const current = getCurrentStep([]);
    expect(current).toBeNull();
  });

  it("returns the only pending step when others are approved", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "approved" }),
      makeStep({ stepOrder: 2, status: "rejected" }),
      makeStep({ stepOrder: 3, status: "pending" }),
    ];
    const current = getCurrentStep(steps);
    expect(current?.stepOrder).toBe(3);
  });
});

describe("approvalStepService — isAllApproved", () => {
  it("returns true when all steps are approved", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "approved" }),
      makeStep({ stepOrder: 2, status: "approved" }),
    ];
    expect(isAllApproved(steps)).toBe(true);
  });

  it("returns false when any step is pending", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "approved" }),
      makeStep({ stepOrder: 2, status: "pending" }),
    ];
    expect(isAllApproved(steps)).toBe(false);
  });

  it("returns false when any step is rejected", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "approved" }),
      makeStep({ stepOrder: 2, status: "rejected" }),
    ];
    expect(isAllApproved(steps)).toBe(false);
  });

  it("returns true for an empty array", () => {
    expect(isAllApproved([])).toBe(true);
  });
});

describe("approvalStepService — getStepsToReset", () => {
  it("returns steps with stepOrder >= rejectedStepOrder", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "approved" }),
      makeStep({ stepOrder: 2, status: "rejected" }),
      makeStep({ stepOrder: 3, status: "pending" }),
    ];
    const toReset = getStepsToReset(steps, 2);
    expect(toReset).toHaveLength(2);
    expect(toReset.map((s) => s.stepOrder)).toEqual([2, 3]);
  });

  it("returns all steps when rejectedStepOrder is 1", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "rejected" }),
      makeStep({ stepOrder: 2, status: "pending" }),
    ];
    const toReset = getStepsToReset(steps, 1);
    expect(toReset).toHaveLength(2);
  });

  it("returns only the last step when rejectedStepOrder equals the last stepOrder", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "approved" }),
      makeStep({ stepOrder: 2, status: "approved" }),
      makeStep({ stepOrder: 3, status: "rejected" }),
    ];
    const toReset = getStepsToReset(steps, 3);
    expect(toReset).toHaveLength(1);
    expect(toReset[0].stepOrder).toBe(3);
  });

  it("preserves steps before rejectedStepOrder (approved steps stay approved)", () => {
    const steps: ApprovalStep[] = [
      makeStep({ stepOrder: 1, status: "approved" }),
      makeStep({ stepOrder: 2, status: "rejected" }),
      makeStep({ stepOrder: 3, status: "pending" }),
    ];
    const toReset = getStepsToReset(steps, 2);
    const notReset = steps.filter((s) => !toReset.includes(s));
    expect(notReset).toHaveLength(1);
    expect(notReset[0].stepOrder).toBe(1);
    expect(notReset[0].status).toBe("approved");
  });
});

describe("approvalStepService — canApprove", () => {
  it("returns true when actorRole matches step approverRole", () => {
    const step = makeStep({ stepOrder: 1, status: "pending", approverRole: "admin" });
    expect(canApprove(step, "admin")).toBe(true);
  });

  it("returns false when actorRole does not match step approverRole", () => {
    const step = makeStep({ stepOrder: 1, status: "pending", approverRole: "admin" });
    expect(canApprove(step, "member")).toBe(false);
  });

  it("returns false for empty actorRole", () => {
    const step = makeStep({ stepOrder: 1, status: "pending", approverRole: "admin" });
    expect(canApprove(step, "")).toBe(false);
  });

  it("returns true when manager approves a manager step", () => {
    const step = makeStep({ stepOrder: 1, status: "pending", approverRole: "manager" });
    expect(canApprove(step, "manager")).toBe(true);
  });

  it("returns false when manager tries to approve a finance step", () => {
    const step = makeStep({ stepOrder: 2, status: "pending", approverRole: "finance" });
    expect(canApprove(step, "manager")).toBe(false);
  });

  it("returns true when finance approves a finance step", () => {
    const step = makeStep({ stepOrder: 2, status: "pending", approverRole: "finance" });
    expect(canApprove(step, "finance")).toBe(true);
  });

  it("returns false when finance tries to approve a manager step", () => {
    const step = makeStep({ stepOrder: 1, status: "pending", approverRole: "manager" });
    expect(canApprove(step, "finance")).toBe(false);
  });
});

describe("approvalStepService — isStepExpired", () => {
  const now = new Date("2024-01-15T12:00:00.000Z");

  it("returns false when deadline is null", () => {
    const step = makeStep({ stepOrder: 1, status: "pending", deadline: null });
    expect(isStepExpired(step, now)).toBe(false);
  });

  it("returns false when deadline is in the future", () => {
    const futureDeadline = new Date("2024-01-16T12:00:00.000Z");
    const step = makeStep({ stepOrder: 1, status: "pending", deadline: futureDeadline });
    expect(isStepExpired(step, now)).toBe(false);
  });

  it("returns true when deadline is in the past", () => {
    const pastDeadline = new Date("2024-01-14T12:00:00.000Z");
    const step = makeStep({ stepOrder: 1, status: "pending", deadline: pastDeadline });
    expect(isStepExpired(step, now)).toBe(true);
  });

  it("returns true when deadline equals now (boundary: not strictly future)", () => {
    const step = makeStep({ stepOrder: 1, status: "pending", deadline: now });
    // deadline < now is false when equal, so should return false at exact boundary
    expect(isStepExpired(step, now)).toBe(false);
  });

  it("returns true when deadline is 1ms before now", () => {
    const justPast = new Date(now.getTime() - 1);
    const step = makeStep({ stepOrder: 1, status: "pending", deadline: justPast });
    expect(isStepExpired(step, now)).toBe(true);
  });

  it("uses current time as default when now is not provided", () => {
    const pastDeadline = new Date(Date.now() - 1000);
    const step = makeStep({ stepOrder: 1, status: "pending", deadline: pastDeadline });
    expect(isStepExpired(step)).toBe(true);
  });

  it("returns false for null deadline without explicit now", () => {
    const step = makeStep({ stepOrder: 1, status: "pending", deadline: null });
    expect(isStepExpired(step)).toBe(false);
  });
});
