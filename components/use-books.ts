"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ChatMessageRow,
  CustomerRow,
  DailyCashSummary,
  EntryRow,
  MemoryRow,
  RecordRow,
  RentalAgreementRow,
  RentalAssetRow,
  RentalPaymentRow,
  SupplierPurchaseRow,
} from "@/lib/repo";
import type { Shop } from "@/lib/session";

export interface BooksPayload {
  shop: Shop;
  customers: CustomerRow[];
  entries: EntryRow[];
  records: RecordRow[];
  messages: ChatMessageRow[];
  memory: MemoryRow[];
  assets: RentalAssetRow[];
  agreements: RentalAgreementRow[];
  rentalPayments: RentalPaymentRow[];
  purchases: SupplierPurchaseRow[];
  dailySummary?: DailyCashSummary;
}

let memory: BooksPayload | null = null;

export function useBooks() {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  const [data, setData] = useState<BooksPayload | null>(memory);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!memory);

  const reload = useCallback(async () => {
    const response = await fetch("/api/books");
    if (response.status === 401) {
      routerRef.current.push("/signin");
      return;
    }
    if (!response.ok) {
      setError("Khata load nahi hua.");
      setLoading(false);
      return;
    }
    const payload = (await response.json()) as BooksPayload;
    payload.messages = payload.messages ?? [];
    payload.memory = payload.memory ?? [];
    payload.assets = payload.assets ?? [];
    payload.agreements = payload.agreements ?? [];
    payload.rentalPayments = payload.rentalPayments ?? [];
    payload.purchases = payload.purchases ?? [];
    memory = payload;
    setData(payload);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const response = await fetch("/api/books");
        if (cancel) return;
        if (response.status === 401) {
          setLoading(false);
          routerRef.current.push("/signin");
          return;
        }
        if (!response.ok) {
          setError("Khata load nahi hua.");
          setLoading(false);
          return;
        }
        const payload = (await response.json()) as BooksPayload;
        payload.messages = payload.messages ?? [];
        payload.memory = payload.memory ?? [];
        payload.assets = payload.assets ?? [];
        payload.agreements = payload.agreements ?? [];
        payload.rentalPayments = payload.rentalPayments ?? [];
        payload.purchases = payload.purchases ?? [];
        memory = payload;
        setData(payload);
      } catch {
        if (!cancel) setError("Khata load nahi hua.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const patchShop = useCallback((partial: Partial<Shop>) => {
    setData((current) => {
      if (!current) return current;
      const next = { ...current, shop: { ...current.shop, ...partial } };
      memory = next;
      return next;
    });
  }, []);

  return { data, error, setError, loading, reload, patchShop };
}
