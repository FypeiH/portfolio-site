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
import { coverFor } from "@/lib/project-covers";
import { BackLink } from "./BackLink";
import { DraftBadge } from "./DraftBadge";
import { KeyFacts } from "./KeyFacts";
import { ProjectCover } from "./ProjectCover";
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
  const cover = coverFor(project.slug);
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
    <article className="ui-container max-w-[52rem]! pb-(--section-py) pt-(--space-6)">
      <BackLink label={ui.allProjects} />
      {/* Sans 800, not Anton: the h1 is part of the first paint (visual-direction §3.2 LCP rule). */}
      <header className="mt-(--space-5) border-b-2 border-fg pb-(--space-5)">
        {project.status === "draft" && <DraftBadge />}
        <h1 className="page-title mt-3">{project.title}</h1>
        <p className="mt-(--space-4) text-lead text-muted">{project.summary}</p>
      </header>
      <div className="mt-(--space-6) space-y-4">
        <ProjectMeta project={project} />
        {project.visibility !== "public" && (
          <Callout title={ui.whyNoCode}>{project.confidentialityNote ?? ui.privateNote}</Callout>
        )}
        {project.disclaimer && <Callout title={ui.disclaimerLabel}>{project.disclaimer}</Callout>}
        {/* Private/nda projects show impact under the diagram instead (KeyFacts, spec §3.4). */}
        {impact && project.visibility === "public" && (
          <div className="ui-panel border-accent p-5">
            <p className="ui-label text-accent!">{ui.impactLabel}</p>
            <p className="mt-2 text-lead">{impact}</p>
          </div>
        )}
        {/* Below the meta, so on phones it stays out of the first viewport and never becomes the LCP element. */}
        {cover && <ProjectCover cover={cover} eager className="ui-panel" />}
      </div>
      <div className="prose-case-study mt-4">
        {placement === "header" && facts}
        <Body components={{ Diagram: DiagramSlot }} />
      </div>
      {updatedAt && (
        <p className="ui-label mt-12">
          <time dateTime={toDateTime(updatedAt)}>{fill(ui.updatedOn, { date: formatYearMonth(updatedAt) })}</time>
        </p>
      )}
      <section aria-labelledby="case-study-cta" className="ui-panel mt-12 p-6 shadow-(--shadow-hard)">
        <h2 id="case-study-cta" className="ui-h3 uppercase">
          {ui.caseStudyCtaTitle}
        </h2>
        <HomeLink href="/#contact" className="ui-btn ui-btn-primary mt-5">
          {ui.caseStudyCta}
        </HomeLink>
      </section>
      <div className="mt-12">
        <ProjectPager prev={prev} next={next} />
      </div>
    </article>
  );
}
