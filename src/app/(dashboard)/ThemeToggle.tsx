"use client";

import { useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    const prefersDark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      document.documentElement.dataset.theme = "dark";
    }
    return prefersDark;
  });

  function handleClick() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.dataset.theme = "dark";
      localStorage.setItem("theme", "dark");
    } else {
      delete document.documentElement.dataset.theme;
      localStorage.setItem("theme", "light");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-text-on-dark-muted hover:text-text-on-dark-secondary text-xs cursor-pointer select-none"
    >
      {dark ? "[Light]" : "[Dark]"}
    </button>
  );
}
