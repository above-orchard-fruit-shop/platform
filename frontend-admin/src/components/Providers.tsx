"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { theme } from "@/lib/theme";
import AdminShell from "./AdminShell";
import { ToastProvider } from "./Toast";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </ThemeProvider>
  );
}
