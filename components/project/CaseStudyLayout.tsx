import { HomeLink } from "@/components/ui/HomeLink";
import type { MDXComponents } from "mdx/types";
import type { ComponentType } from "react";
import { Diagram } from "@/components/mdx/Diagram";
import { Callout } from "@/components/ui/Callout";
import type { DiagramImage } from "@/lib/content/diagrams";
import { keyFactsPlacement } from "@/lib/content/diagram-slots";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Project } from "@/lib/content/types";
import { fill } from "@/lib/content/ui";
import { formatYearMonth, toDateTime } from "@/lib/format";
import { BackLink } from "./BackLink";
import { DraftBadge } from "./DraftBadge";
import { KeyFacts } from "./KeyFacts";
import { ProjectMeta } from "./ProjectMeta";
import { ProjectPager } from "./ProjectPager";

interface CaseStudyLayoutProps {
  project: Project;
  prev?: Project;
  next?: Project;
  /** The compiled MDX body; the layout supplies its `<Diagram />` component. */
  body: ComponentType<{ components?: MDXComponents }>;
  diagram?: DiagramImage;
  /** `<Diagram />` uses in the body (getDiagramSlots), decided before rendering. */
  diagramSlots: number;
}

export function CaseStudyLayout({ project, prev, next, body: Body, diagram, diagramSlots }: CaseStudyLayoutProps) {
  const ui = getUi();
  const impact = known(project.impact);
  const updatedAt = known(project.updatedAt);
  // Spec §3.4: problem → solution → impact once for private/nda projects: after the diagram when the
  // body has exactly one <Diagram />, otherwise right after the header (keyFactsPlacement).
  const placement = keyFactsPlacement(project.visibility, diagramSlots);
  const facts = (
    <KeyFacts project={project} impact={impact} labels={{ impactLabel: ui.impactLabel, problemLabel: ui.problemLabel, solutionLabel: ui.solutionLabel }} />
  );
  const DiagramSlot = () => (
    <>
      {diagram && <Diagram image={diagram} label={ui.diagramLabel} />}
      {placement === "diagram" && facts}
    </>
  );

  return (
    <article className="mx-auto max-w-3xl px-5 pb-20 pt-8 md:px-8">
      <BackLink label={ui.allProjects} />
      <header className="mt-6">
        {project.status === "draft" && <DraftBadge />}
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{project.title}</h1>
        <p className="mt-4 text-lg text-muted">{project.summary}</p>
      </header>
      <div className="mt-8 space-y-4">
        <ProjectMeta project={project} />
        {project.visibility !== "public" && (
          <Callout title={ui.whyNoCode}>{project.confidentialityNote ?? ui.privateNote}</Callout>
        )}
        {project.disclaimer && <Callout title={ui.disclaimerLabel}>{project.disclaimer}</Callout>}
        {/* Private/nda projects show impact under the diagram instead (KeyFacts, spec §3.4). */}
        {impact && project.visibility === "public" && (
          <div className="rounded-xl border border-accent/40 bg-surface p-5">
            <p className="text-sm font-medium text-accent">{ui.impactLabel}</p>
            <p className="mt-1 text-lg">{impact}</p>
          </div>
        )}
      </div>
      <div className="prose-case-study mt-4">
        {placement === "header" && facts}
        <Body components={{ Diagram: DiagramSlot }} />
      </div>
      {updatedAt && (
        <p className="mt-12 text-sm text-muted">
          <time dateTime={toDateTime(updatedAt)}>{fill(ui.updatedOn, { date: formatYearMonth(updatedAt) })}</time>
        </p>
      )}
      <section aria-labelledby="case-study-cta" className="mt-12 ui-card p-6">
        <h2 id="case-study-cta" className="text-lg font-semibold">
          {ui.caseStudyCtaTitle}
        </h2>
        <HomeLink href="/#contact" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-bg hover:bg-accent-strong">
          {ui.caseStudyCta}
        </HomeLink>
      </section>
      <div className="mt-12">
        <ProjectPager prev={prev} next={next} />
      </div>
    </article>
  );
}
