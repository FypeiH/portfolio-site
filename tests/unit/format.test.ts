import { describe, expect, it } from "vitest";
import { fill } from "@/lib/content/ui";
import { formatPeriod, formatYearMonth, toDateTime } from "@/lib/format";

describe("formatPeriod", () => {
  it("formats a closed period", () => {
    expect(formatPeriod("2024-03", "2025-02", "Present")).toBe("Mar 2024 – Feb 2025");
  });

  it("uses the present label", () => {
    expect(formatPeriod("2025-03", "present", "Present")).toBe("Mar 2025 – Present");
  });

  it("formats a single month without an end", () => {
    expect(formatPeriod("2026-09", undefined, "Present")).toBe("Sep 2026");
  });

  it("renders placeholders as a dash", () => {
    expect(formatYearMonth("{{TODO: YYYY-MM}}")).toBe("—");
    expect(toDateTime("{{TODO: YYYY-MM}}")).toBeUndefined();
    expect(toDateTime("2026-08")).toBe("2026-08");
  });
});

describe("fill", () => {
  it("replaces runtime slots and keeps unknown ones", () => {
    expect(fill("Team of {teamSize}", { teamSize: 3 })).toBe("Team of 3");
    expect(fill("© {year} {name}", { year: 2026 })).toBe("© 2026 {name}");
  });
});
