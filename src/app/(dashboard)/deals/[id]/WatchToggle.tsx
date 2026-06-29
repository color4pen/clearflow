"use client";

import { useTransition } from "react";
import { watchDealAction, unwatchDealAction } from "@/app/actions/watches";

type Props = {
  dealId: string;
  isWatching: boolean;
};

export function WatchToggle({ dealId, isWatching }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isWatching) {
        await unwatchDealAction(dealId);
      } else {
        await watchDealAction(dealId);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isWatching}
      title={isWatching ? "ウォッチ中（クリックで解除）" : "この案件をウォッチ"}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border rounded-full transition-colors disabled:opacity-50 ${
        isWatching
          ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
          : "bg-bg-surface text-text-muted border-border hover:border-primary hover:text-primary"
      }`}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill={isWatching ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9 6.8 19.6l1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
      {isPending ? "..." : isWatching ? "ウォッチ中" : "ウォッチ"}
    </button>
  );
}
