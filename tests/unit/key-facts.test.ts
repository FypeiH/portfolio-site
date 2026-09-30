import { createElement, Fragment, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MDXComponents } from "mdx/types";
import { describe, expect, it, vi } from "vitest";
import { CaseStudyLayout } from "@/components/project/CaseStudyLayout";
import { KeyFacts } from "@/components/project/KeyFacts";
import { countDiagramSlots, keyFactsPlacement } from "@/lib/content/diagram-slots";
import { getDiagramImage, getDiagramSlots, getProjectBySlug } from "@/lib/content/load";
import type { Project } from "@/lib/content/types";

// BackLink reads the app router, which only exists inside Next; it is irrelevant to KeyFacts.
vi.mock("@/components/project/BackLink", () => ({ BackLink: () => null }));

const privateProject = getProjectBySlug("email-scraper") as Project;
const publicProject = getProjectBySlug("fidu-bot") as Project;

/** A stand-in MDX body with `slots` `<Diagram />` uses between two paragraphs. */
function body(slots: number): ComponentType<{ components?: MDXComponents }> {
  return function Body({ components }) {
    const Diagram = (components?.Diagram ?? (() => null)) as ComponentType;
    return createElement(Fragment, null, createElement("p", null, "intro"), ...Array.from({ length: slots }, (_, i) => createElement(Diagram, { key: i })), createElement("p", null, "outro"));
  };
}

const render = (project: Project, slots: number) =>
  renderToStaticMarkup(createElement(CaseStudyLayout, { project, body: body(slots), diagram: getDiagramImage(project), diagramSlots: slots }));
const count = (html: string, needle: string) => html.split(needle).length - 1;

describe("KeyFacts placement (spec §3.4)", () => {
  it("counts <Diagram /> outside code and comments", () => {
    expect(countDiagramSlots("## Architecture\n\n<Diagram />\n\ntext")).toBe(1);
    expect(countDiagramSlots("<Diagram />\n\n```mdx\n<Diagram />\n```\n\n`<Diagram />` {/* <Diagram /> */}")).toBe(1);
    expect(countDiagramSlots("no diagram")).toBe(0);
    expect(getDiagramSlots("email-scraper")).toBe(1);
  });

  it("decides the placement from visibility and slot count", () => {
    expect(keyFactsPlacement("public", 1)).toBe("none");
    expect(keyFactsPlacement("private", 1)).toBe("diagram");
    expect(keyFactsPlacement("nda", 0)).toBe("header");
    expect(keyFactsPlacement("private", 2)).toBe("header");
  });

  it("private project: once, right after the diagram", () => {
    const html = render(privateProject, 1);
    expect(count(html, "data-key-facts")).toBe(1);
    expect(html.indexOf("</figure>")).toBeLessThan(html.indexOf("data-key-facts"));
    expect(html.indexOf("data-key-facts")).toBeLessThan(html.indexOf("outro"));
  });

  it("private project without <Diagram />: once, right after the header, before the body", () => {
    const html = render(privateProject, 0);
    expect(count(html, "data-key-facts")).toBe(1);
    expect(html.indexOf("data-key-facts")).toBeLessThan(html.indexOf("intro"));
  });

  it("private project with two <Diagram />: still once", () => {
    const html = render(privateProject, 2);
    expect(count(html, "<figure")).toBe(2);
    expect(count(html, "data-key-facts")).toBe(1);
  });

  it("public project: never", () => {
    expect(count(render(publicProject, 1), "data-key-facts")).toBe(0);
  });
});

describe("KeyFacts labels (optional ui.problemLabel / ui.solutionLabel)", () => {
  const labelled = (labels: Parameters<typeof KeyFacts>[0]["labels"]) =>
    renderToStaticMarkup(createElement(KeyFacts, { project: privateProject, impact: "Impact text.", labels }));

  it("renders labels like the Impact label when present", () => {
    const html = labelled({ impactLabel: "Impact", problemLabel: "Problem", solutionLabel: "Solution" });
    const label = (text: string) => `<span class="block text-sm font-medium text-accent">${text}</span>`;
    for (const text of ["Problem", "Solution", "Impact"]) expect(html).toContain(label(text));
    expect(html.indexOf("Problem")).toBeLessThan(html.indexOf("Solution"));
  });

  it("renders plain paragraphs without them", () => {
    const html = labelled({ impactLabel: "Impact" });
    expect(count(html, "text-accent")).toBe(1);
    expect(html).toContain(`<p>${privateProject.solution}</p>`);
  });
});
