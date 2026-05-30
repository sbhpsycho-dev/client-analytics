import { redirect } from "next/navigation";
import { resolveTenantBySlug } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { ClientSidebar } from "@/components/shared/ClientSidebar";
import { ClientTopNav } from "@/components/shared/ClientTopNav";
import { MobileNav } from "@/components/shared/MobileNav";
import { BrandProvider } from "@/components/shared/BrandProvider";
import { AlertCircle } from "lucide-react";

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenantData = await resolveTenantBySlug(slug);
  if (!tenantData) redirect("/login");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conn } = await supabase
    .from("sheet_connections" as any)
    .select("last_sync_status")
    .eq("tenant_id", tenantData.id)
    .single() as any;

  const syncError = conn?.last_sync_status === "error";

  return (
    <BrandProvider brandColor={tenantData.brand_color}>
      <div className="flex h-screen overflow-hidden" style={{ background: "#080f1e" }}>

        {/* Desktop sidebar — hidden below lg */}
        <div className="hidden lg:flex">
          <ClientSidebar
            tenantSlug={slug}
            tenantName={tenantData.name}
            logoUrl={tenantData.logo_url}
            brandColor={tenantData.brand_color}
          />
        </div>

        {/* Main content column */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">

          {/* Mobile top bar (hamburger) — only shown below lg */}
          <MobileNav
            tenantSlug={slug}
            tenantName={tenantData.name}
            brandColor={tenantData.brand_color}
          />

          {syncError && (
            <div
              className="flex items-center gap-2.5 px-5 py-2.5 text-sm shrink-0"
              style={{
                background: "rgba(120,50,10,0.4)",
                borderBottom: "1px solid rgba(245,158,11,0.2)",
                color: "#fcd34d",
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              Data sync paused — your account manager has been notified.
            </div>
          )}

          {/* Horizontal tab bar — shown on all breakpoints */}
          <ClientTopNav tenantSlug={slug} brandColor={tenantData.brand_color} />

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </BrandProvider>
  );
}
