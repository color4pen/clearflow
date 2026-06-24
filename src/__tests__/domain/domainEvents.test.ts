/**
 * Domain event infrastructure tests
 *
 * Tests for EventDispatcher: runInContext scope isolation, sync/async handler
 * execution, error propagation, buffer lifecycle, and concurrent scope independence.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import path from "path";
import { readFile } from "fs/promises";
import { EventDispatcher } from "@/domain/events";
import type { DomainEvent } from "@/domain/events";

const ROOT = path.join(import.meta.dir, "../../..");

async function readSrc(relPath: string): Promise<string> {
  return readFile(path.join(ROOT, "src", relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeEvent(type: DomainEvent["type"] = "inquiry.converted"): DomainEvent {
  if (type === "inquiry.converted") {
    return {
      type: "inquiry.converted",
      organizationId: "org-1",
      actorId: "actor-1",
      occurredAt: new Date(),
      payload: { inquiryId: "inq-1", dealId: "deal-1" },
    };
  }
  if (type === "deal.won") {
    return {
      type: "deal.won",
      organizationId: "org-1",
      actorId: "actor-1",
      occurredAt: new Date(),
      payload: { dealId: "deal-1", fromPhase: "negotiation" },
    };
  }
  if (type === "contract.created") {
    return {
      type: "contract.created",
      organizationId: "org-1",
      actorId: "actor-1",
      occurredAt: new Date(),
      payload: { contractId: "contract-1", dealId: "deal-1", clientId: "client-1" },
    };
  }
  throw new Error(`makeEvent: unsupported type "${type}"`);
}

// ---------------------------------------------------------------------------
// EventDispatcher tests
// ---------------------------------------------------------------------------

describe("EventDispatcher", () => {
  let d: EventDispatcher;

  beforeEach(() => {
    d = new EventDispatcher();
  });

  // -------------------------------------------------------------------------
  // Sync handlers
  // -------------------------------------------------------------------------

  it("sync handler is called immediately when dispatch() is invoked", async () => {
    const called: string[] = [];
    d.on("inquiry.converted", () => { called.push("sync"); }, "sync");

    await d.runInContext(async () => {
      // intentional: not awaited — verifies sync handler runs synchronously before any await resolves
      d.dispatch(makeEvent("inquiry.converted"));
      expect(called).toEqual(["sync"]);
    });
  });

  it("sync handler exception propagates to dispatch() caller", async () => {
    d.on("inquiry.converted", () => { throw new Error("sync-error"); }, "sync");

    let caughtError: Error | null = null;
    await d.runInContext(async () => {
      try {
        await d.dispatch(makeEvent("inquiry.converted"));
      } catch (err) {
        caughtError = err as Error;
      }
    });

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe("sync-error");
  });

  it("sync handler exception prevents buffering — async handler does not run", async () => {
    // The spec says sync exception propagates; the event is not buffered if dispatch throws.
    // This test verifies that after a sync handler throw, the buffer is NOT populated.
    d.on("inquiry.converted", () => { throw new Error("sync-error"); }, "sync");
    const asyncCalled: string[] = [];
    d.on("inquiry.converted", async () => { asyncCalled.push("async"); }, "async");

    await d.runInContext(async () => {
      try {
        await d.dispatch(makeEvent("inquiry.converted"));
      } catch {
        // expected
      }
      // Since dispatch threw, the event should NOT have been buffered
      d.flushAsync();
    });

    // Give async handlers a chance to run
    await new Promise((r) => setTimeout(r, 10));
    // The event was not buffered (dispatch threw before buffering), so async handler should not run
    expect(asyncCalled).toEqual([]);
  });

  it("TC-002: options (tx) are propagated to sync handlers", async () => {
    let receivedOptions: { tx?: unknown } | undefined;
    d.on("inquiry.converted", (_event, options) => {
      receivedOptions = options;
    }, "sync");

    await d.runInContext(async () => {
      await d.dispatch(makeEvent("inquiry.converted"), { tx: "mock-tx" });
    });

    expect(receivedOptions?.tx).toBe("mock-tx");
  });

  // -------------------------------------------------------------------------
  // Async handlers
  // -------------------------------------------------------------------------

  it("async handler is NOT called during dispatch()", async () => {
    const called: string[] = [];
    d.on("inquiry.converted", async () => { called.push("async"); }, "async");

    await d.runInContext(async () => {
      await d.dispatch(makeEvent("inquiry.converted"));
      // At this point, async handler should NOT have been called
      expect(called).toEqual([]);
    });
  });

  it("async handler IS called after flushAsync()", async () => {
    const called: string[] = [];
    d.on("inquiry.converted", async () => { called.push("async"); }, "async");

    await d.runInContext(async () => {
      await d.dispatch(makeEvent("inquiry.converted"));
      d.flushAsync();
    });

    // Wait for async handlers to run
    await new Promise((r) => setTimeout(r, 20));
    expect(called).toEqual(["async"]);
  });

  it("async handler exception does NOT propagate to flushAsync() caller", async () => {
    d.on("inquiry.converted", async () => { throw new Error("async-error"); }, "async");

    let flushThrew = false;
    await d.runInContext(async () => {
      await d.dispatch(makeEvent("inquiry.converted"));
      try {
        d.flushAsync();
      } catch {
        flushThrew = true;
      }
    });

    expect(flushThrew).toBe(false);
    // Give async handler a chance to fail
    await new Promise((r) => setTimeout(r, 20));
  });

  // -------------------------------------------------------------------------
  // Buffer lifecycle
  // -------------------------------------------------------------------------

  it("runInContext creates an isolated buffer; events are not leaked outside", async () => {
    const asyncCalled: string[] = [];
    d.on("inquiry.converted", async () => { asyncCalled.push("async"); }, "async");

    // Dispatch inside context — but do NOT call flushAsync
    await d.runInContext(async () => {
      await d.dispatch(makeEvent("inquiry.converted"));
      // No flushAsync — buffer should be discarded when context ends
    });

    // Wait to make sure no async handler was fired
    await new Promise((r) => setTimeout(r, 20));
    expect(asyncCalled).toEqual([]);
  });

  it("buffer is auto-discarded when runInContext callback returns null-like value", async () => {
    const asyncCalled: string[] = [];
    d.on("inquiry.converted", async () => { asyncCalled.push("async"); }, "async");

    await d.runInContext(async () => {
      await d.dispatch(makeEvent("inquiry.converted"));
      return null; // simulate null return without flush
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(asyncCalled).toEqual([]);
  });

  it("buffer is auto-discarded when runInContext callback throws", async () => {
    const asyncCalled: string[] = [];
    d.on("inquiry.converted", async () => { asyncCalled.push("async"); }, "async");

    try {
      await d.runInContext(async () => {
        await d.dispatch(makeEvent("inquiry.converted"));
        throw new Error("callback-error");
      });
    } catch {
      // expected
    }

    await new Promise((r) => setTimeout(r, 20));
    // Buffer was discarded (no flushAsync called), async handler should not run
    expect(asyncCalled).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Concurrent scope independence
  // -------------------------------------------------------------------------

  it("concurrent runInContext scopes have independent buffers", async () => {
    const asyncCalledEvents: string[] = [];

    d.on("inquiry.converted", async (e) => {
      asyncCalledEvents.push(`${e.type}:${e.payload.inquiryId}`);
    }, "async");

    d.on("deal.won", async (e) => {
      asyncCalledEvents.push(`${e.type}:${e.payload.dealId}`);
    }, "async");

    // Run two concurrent contexts
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const ctx1 = d.runInContext(async () => {
      const event1: DomainEvent = {
        type: "inquiry.converted",
        organizationId: "org-1",
        actorId: "a",
        occurredAt: new Date(),
        payload: { inquiryId: "inq-ctx1", dealId: "deal-ctx1" },
      };
      await d.dispatch(event1);
      await pause(5); // yield to allow ctx2 to run
      d.flushAsync();
    });

    const ctx2 = d.runInContext(async () => {
      const event2: DomainEvent = {
        type: "deal.won",
        organizationId: "org-2",
        actorId: "b",
        occurredAt: new Date(),
        payload: { dealId: "deal-ctx2", fromPhase: "negotiation" },
      };
      await d.dispatch(event2);
      await pause(5);
      d.flushAsync();
    });

    await Promise.all([ctx1, ctx2]);
    await pause(30);

    // Each context should only have flushed its own events
    expect(asyncCalledEvents).toContain("inquiry.converted:inq-ctx1");
    expect(asyncCalledEvents).toContain("deal.won:deal-ctx2");
    // ctx1 should NOT have flushed deal.won, ctx2 should NOT have flushed inquiry.converted
    const ctx1Events = asyncCalledEvents.filter((e) => e.startsWith("inquiry.converted"));
    const ctx2Events = asyncCalledEvents.filter((e) => e.startsWith("deal.won"));
    expect(ctx1Events.length).toBe(1);
    expect(ctx2Events.length).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Multiple handlers
  // -------------------------------------------------------------------------

  it("multiple handlers can be registered for the same event type", async () => {
    const called: string[] = [];
    d.on("inquiry.converted", () => { called.push("sync1"); }, "sync");
    d.on("inquiry.converted", () => { called.push("sync2"); }, "sync");
    d.on("inquiry.converted", async () => { called.push("async1"); }, "async");

    await d.runInContext(async () => {
      await d.dispatch(makeEvent("inquiry.converted"));
      // sync handlers called immediately (all sync handlers run before dispatch resolves)
      expect(called).toContain("sync1");
      expect(called).toContain("sync2");
      d.flushAsync();
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(called).toContain("async1");
  });

  it("handlers for different event types do not interfere", async () => {
    const called: string[] = [];
    d.on("inquiry.converted", () => { called.push("inquiry-sync"); }, "sync");
    d.on("deal.won", () => { called.push("deal-sync"); }, "sync");

    await d.runInContext(async () => {
      await d.dispatch(makeEvent("inquiry.converted"));
      expect(called).toContain("inquiry-sync");
      expect(called).not.toContain("deal-sync");

      await d.dispatch(makeEvent("deal.won"));
      expect(called).toContain("deal-sync");
    });
  });

  // -------------------------------------------------------------------------
  // reset()
  // -------------------------------------------------------------------------

  it("reset() clears all registered handlers", async () => {
    const called: string[] = [];
    d.on("inquiry.converted", () => { called.push("sync"); }, "sync");
    d.reset();

    await d.runInContext(async () => {
      await d.dispatch(makeEvent("inquiry.converted"));
      d.flushAsync();
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(called).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // dispatch() outside runInContext throws
  // -------------------------------------------------------------------------

  it("dispatch() outside runInContext throws an error", async () => {
    await expect(d.dispatch(makeEvent("inquiry.converted"))).rejects.toThrow(
      "dispatcher.dispatch() called outside of runInContext() scope"
    );
  });
});

// ---------------------------------------------------------------------------
// Static code analysis — new usecases dispatch events
// ---------------------------------------------------------------------------

describe("New usecase domain event dispatch (static analysis)", () => {
  it("updateInquiryStatus.ts imports and uses dispatcher", async () => {
    const src = await readSrc("application/usecases/updateInquiryStatus.ts");
    expect(src).toContain("dispatcher");
    expect(src).toContain("dispatcher.runInContext");
    expect(src).toContain("dispatcher.dispatch");
    expect(src).toContain("dispatcher.flushAsync");
  });

  it("updateDealPhase.ts imports and uses dispatcher", async () => {
    const src = await readSrc("application/usecases/updateDealPhase.ts");
    expect(src).toContain("dispatcher");
    expect(src).toContain("dispatcher.runInContext");
    expect(src).toContain("dispatcher.dispatch");
    expect(src).toContain("dispatcher.flushAsync");
  });

  it("createContract.ts imports and uses dispatcher", async () => {
    const src = await readSrc("application/usecases/createContract.ts");
    expect(src).toContain("dispatcher");
    expect(src).toContain("dispatcher.runInContext");
    expect(src).toContain("dispatcher.dispatch");
    expect(src).toContain("dispatcher.flushAsync");
  });

  it("updateContractStatus.ts imports and uses dispatcher", async () => {
    const src = await readSrc("application/usecases/updateContractStatus.ts");
    expect(src).toContain("dispatcher");
    expect(src).toContain("dispatcher.runInContext");
    expect(src).toContain("dispatcher.dispatch");
    expect(src).toContain("dispatcher.flushAsync");
  });

  it("updateInvoiceStatus.ts imports and uses dispatcher", async () => {
    const src = await readSrc("application/usecases/updateInvoiceStatus.ts");
    expect(src).toContain("dispatcher");
    expect(src).toContain("dispatcher.runInContext");
    expect(src).toContain("dispatcher.dispatch");
    expect(src).toContain("dispatcher.flushAsync");
  });

  it("domain/events/dispatcher.ts does not import from @/infrastructure", async () => {
    const src = await readSrc("domain/events/dispatcher.ts");
    expect(src).not.toContain("@/infrastructure");
  });

  it("domain/events/types.ts does not import from @/infrastructure", async () => {
    const src = await readSrc("domain/events/types.ts");
    expect(src).not.toContain("@/infrastructure");
  });
});
