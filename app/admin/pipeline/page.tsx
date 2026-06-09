import { getAdminDashboardStats } from "@/lib/analytics/daily-numbers";
import type { PipelineRep } from "@/lib/analytics/sheet-metrics";
import { PipelineClient } from "./PipelineClient";

export const dynamic = "force-dynamic";

const REP_COLORS = ["#1D9E75", "#D8843A", "#D957A8", "#3B6FB5", "#8A5BC7", "#4a7ab5"];

export default async function PipelinePage() {
  const { repStats, live, lastFetched } = await getAdminDashboardStats();

  const reps: PipelineRep[] = repStats.map((r, i) => ({
    name:          r.name,
    color:         REP_COLORS[i % REP_COLORS.length],
    callsMade:     r.callsMade,
    callsAnswered: r.connects,
    demosSet:      r.set,
    demosShowed:   r.show,
    pitched:       r.show,
    closed:        r.sales,
  }));

  return (
    <PipelineClient
      reps={reps}
      live={live}
      lastFetched={lastFetched}
    />
  );
}
