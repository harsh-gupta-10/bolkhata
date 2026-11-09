"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { PersonDetail } from "@/components/books";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PersonGate />
    </Suspense>
  );
}

function PersonGate() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id) return null;
  return <PersonDetail id={id} />;
}
