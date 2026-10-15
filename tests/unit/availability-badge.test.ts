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

  it("hero order: name (h1), role, Will's support line, badge, CTAs", () => {
    const html = renderToStaticMarkup(createElement(HeroSection, { profile }));
    const h1 = html.match(/<h1[^>]*>([^<]*)<\/h1>/);
    expect(h1?.[1]).toBe(profile.name);
    expect(h1?.[0]).toContain('class="hero-name"');
    const at = (needle: string) => {
      const index = html.indexOf(needle);
      expect(index, needle).toBeGreaterThan(-1);
      return index;
    };
    const order = ["<h1", "Backend engineer,", "Open to backend and AI roles", profile.availability.label, "<a "].map(at);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
