"use client";

import { RosProvider } from "@/lib/RosContext";
import { ReactNode } from "react";

export default function RosProviderWrapper({ children }: { children: ReactNode }) {
  return <RosProvider>{children}</RosProvider>;
}
