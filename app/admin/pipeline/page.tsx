import { getSheetMetrics } from "@/lib/analytics/sheet-metrics";
import { PipelineClient } from "./PipelineClient";

export const revalidate = 30;

export default async function PipelinePage() {
  const metrics = await getSheetMetrics();
  return (
    <PipelineClient
      reps={metrics.pipeline}
      live={metrics.live}
      lastFetched={metrics.lastFetched}
    />
  );
}
