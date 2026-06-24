import { AsyncLocalStorage } from "async_hooks";
import type { DomainEvent } from "./types";

export type DispatchOptions = { tx?: unknown };

export type EventHandler<T extends DomainEvent> = (event: T, options?: DispatchOptions) => void | Promise<void>;

type HandlerEntry = {
  handler: EventHandler<DomainEvent>;
  mode: "sync" | "async";
};

export class EventDispatcher {
  private readonly als = new AsyncLocalStorage<DomainEvent[]>();
  private readonly handlers = new Map<string, HandlerEntry[]>();

  on<T extends DomainEvent>(
    eventType: T["type"],
    handler: EventHandler<T>,
    mode: "sync" | "async"
  ): void {
    const entries = this.handlers.get(eventType) ?? [];
    entries.push({ handler: handler as EventHandler<DomainEvent>, mode });
    this.handlers.set(eventType, entries);
  }

  runInContext<T>(callback: () => Promise<T>): Promise<T> {
    return this.als.run([], callback);
  }

  async dispatch(event: DomainEvent, options?: DispatchOptions): Promise<void> {
    const buffer = this.als.getStore();
    if (buffer === undefined) {
      throw new Error(
        "dispatcher.dispatch() called outside of runInContext() scope. Wrap the usecase in dispatcher.runInContext()."
      );
    }

    // Execute sync handlers immediately — exceptions propagate to caller
    const entries = this.handlers.get(event.type) ?? [];
    for (const entry of entries) {
      if (entry.mode === "sync") {
        // Sync handlers are awaited so that async DB operations within them
        // (e.g. auditLogRepository.create) complete before dispatch returns.
        // Exceptions propagate naturally to the dispatch() caller (and thus the transaction).
        await entry.handler(event, options);
      }
    }

    // Buffer the event for async handlers
    buffer.push(event);
  }

  flushAsync(): void {
    const buffer = this.als.getStore();
    if (buffer === undefined) {
      return;
    }

    const events = buffer.splice(0);
    for (const event of events) {
      const entries = this.handlers.get(event.type) ?? [];
      for (const entry of entries) {
        if (entry.mode === "async") {
          void Promise.resolve(entry.handler(event)).catch((err) => {
            console.error(
              `[EventDispatcher] Async handler for "${event.type}" threw an error:`,
              err
            );
          });
        }
      }
    }
  }

  reset(): void {
    this.handlers.clear();
  }
}

export const dispatcher = new EventDispatcher();
