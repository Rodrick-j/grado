"use client";

import React from "react";
import { AppShell } from "@/components/AppShell";
import TelemedicinaPage from "@/components/pages/TelemedicinaPage";

export default function TelemedicinaRoute() {
  return (
    <AppShell>
      <TelemedicinaPage />
    </AppShell>
  );
}
