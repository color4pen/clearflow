"use client";

import { useEffect } from "react";

export function RowClickHandler() {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("a,button")) return;
      const row = target.closest("tr[data-href]");
      if (row) {
        window.location.href = (row as HTMLElement).dataset.href!;
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
