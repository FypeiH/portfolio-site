import { getUi } from "@/lib/content/load";
import type { Metric } from "@/lib/content/types";

const CONTEXT_LABEL_KEYS = {
  production: "metricProduction",
  academic: "metricAcademic",
  personal: "metricPersonal",
  benchmark: "metricBenchmark",
} as const;

/** Metric row in mono: label and context in subtle, the value in accent. Only real metrics exist (schema). */
export function MetricBadge({ metric }: { metric: Metric }) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 font-mono text-sm uppercase">
      <span className="text-subtle">{metric.label}</span>
      <span className="font-semibold text-accent">{metric.value}</span>
      <span className="text-xs text-subtle">({getUi()[CONTEXT_LABEL_KEYS[metric.context]]})</span>
    </p>
  );
}
