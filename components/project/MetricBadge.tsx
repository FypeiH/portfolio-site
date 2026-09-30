import { getUi } from "@/lib/content/load";
import type { Metric } from "@/lib/content/types";

const CONTEXT_LABEL_KEYS = {
  production: "metricProduction",
  academic: "metricAcademic",
  personal: "metricPersonal",
  benchmark: "metricBenchmark",
} as const;

export function MetricBadge({ metric }: { metric: Metric }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="text-lg font-semibold text-fg">{metric.value}</span>
      <span className="text-muted">{metric.label}</span>
      <span className="text-xs text-muted">({getUi()[CONTEXT_LABEL_KEYS[metric.context]]})</span>
    </p>
  );
}
