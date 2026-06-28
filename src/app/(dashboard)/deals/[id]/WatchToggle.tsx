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
      className={`text-xs px-3 py-1.5 border rounded transition-colors ${
        isWatching
          ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
          : "bg-transparent text-text-muted border-border hover:bg-bg-hover"
      } disabled:opacity-50`}
    >
      {isPending ? "..." : isWatching ? "Watching" : "Watch"}
    </button>
  );
}
