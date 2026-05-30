import { Suspense } from "react";
import { resolveTenantBySlug } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { TrackersClient } from "./TrackersClient";
import type { Period } from "./mockData";

export default async function TrackersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ view?: string; period?: string }>;
}) {
  const { tenant: slug } = await params;
  const sp = await searchParams;

  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) redirect("/login");

  const validViews = ["overview", "director", "setters", "va"];
  const validPeriods: Period[] = ["7d", "mtd", "qtd", "ytd"];

  const initialView = (validViews.includes(sp.view ?? "") ? sp.view : "overview") as "overview" | "director" | "setters" | "va";
  const initialPeriod = (validPeriods.includes((sp.period ?? "") as Period) ? sp.period : "mtd") as Period;

  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <div className="h-8 w-48 rounded-lg bg-zinc-800/60 animate-pulse" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl bg-zinc-800/60 animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </div>
      }
    >
      <TrackersClient
        initialView={initialView}
        initialPeriod={initialPeriod}
        tenantSlug={slug}
        brandColor={tenant.brand_color}
      />
    </Suspense>
  );
}
