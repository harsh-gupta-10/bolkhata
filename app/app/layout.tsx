"use client";

import { AppFrame } from "@/components/shop-provider";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <AppFrame>{children}</AppFrame>;
}
