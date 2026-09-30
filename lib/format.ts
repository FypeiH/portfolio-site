import { isYearMonth } from "@/lib/content/conventions";
import { isPlaceholder } from "@/lib/content/placeholders";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DASH = "—";

/** "2025-03" → "Mar 2025". Unfilled placeholders render as a dash. */
export function formatYearMonth(value: string): string {
  if (isPlaceholder(value)) return DASH;
  const [year, month] = value.split("-");
  return `${MONTHS[Number(month) - 1] ?? ""} ${year}`.trim();
}

/** ("2025-03", "present") → "Mar 2025 – Present" */
export function formatPeriod(start: string, end: string | undefined, presentLabel: string): string {
  if (end === undefined) return formatYearMonth(start);
  const endLabel = end === "present" ? presentLabel : formatYearMonth(end);
  return `${formatYearMonth(start)} – ${endLabel}`;
}

/** Machine-readable value for <time dateTime>, or undefined for placeholders and "present". */
export function toDateTime(value: string): string | undefined {
  return isYearMonth(value) ? value : undefined;
}
