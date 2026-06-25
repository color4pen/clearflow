"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/app/components";

export function DashboardProviders({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
