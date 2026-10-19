import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProjectScreenshots } from "@/components/project/ProjectScreenshots";

const render = (screenshots: Parameters<typeof ProjectScreenshots>[0]["screenshots"]) =>
  renderToStaticMarkup(createElement(ProjectScreenshots, { screenshots, label: "Screenshots" }));

describe("ProjectScreenshots", () => {
  it("renders a labelled section with one lazy, sized figure per screenshot and optional captions", () => {
    const html = render([
      { src: "/images/projects/a/dashboard.webp", alt: "Dashboard with fictitious data", width: 1440, height: 900, caption: "Dashboard" },
      { src: "/images/projects/a/detail.webp", alt: "Contact detail with fictitious data", width: 1440, height: 900 },
    ]);
    expect(html).toContain('aria-labelledby="case-study-screenshots"');
    expect(html).toContain('<h2 id="case-study-screenshots"');
    expect(html.match(/<figure/g)).toHaveLength(2);
    expect(html.match(/<figcaption/g)).toHaveLength(1);
    expect(html).toContain('alt="Dashboard with fictitious data"');
    expect(html).toContain('width="1440" height="900" loading="lazy"');
  });
});
