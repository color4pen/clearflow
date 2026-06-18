"use client";

import { useState, useEffect } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (prefersDark) {
      setDark(true);
      document.documentElement.dataset.theme = "dark";
    }
  }, []);

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
