import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroSection } from "@/components/sections/HeroSection";
import { AvailabilityBadge } from "@/components/ui/AvailabilityBadge";
import { profile } from "@/content/profile";

const text = (html: string) => html.replace(/<[^>]+>/g, "");

describe("availability badge (spec §1.1, Filipe's decision 2026-10-15)", () => {
  it("renders profile.availability with the status colour, brackets and square hidden from screen readers", () => {
    const html = renderToStaticMarkup(createElement(AvailabilityBadge, { availability: profile.availability }));
    expect(profile.availability.label).toBe("Open to software engineering roles");
    expect(text(html)).toBe("[Open to software engineering roles]");
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(3);
    expect(html).toContain("bg-success");
    const selective = renderToStaticMarkup(createElement(AvailabilityBadge, { availability: { status: "selective", label: "x" } }));
    expect(selective).toContain("bg-accent");
  });

  it("sits in the hero before the h1, next to Will's support line", () => {
    const html = renderToStaticMarkup(createElement(HeroSection, { profile }));
    const badge = html.indexOf(profile.availability.label);
    expect(badge).toBeGreaterThan(-1);
    expect(badge).toBeLessThan(html.indexOf("<h1"));
    expect(text(html)).toContain("Open to backend and AI roles");
  });
});
