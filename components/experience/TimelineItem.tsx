import Link from "next/link";
import { TagList } from "@/components/ui/Tag";
import { EMPLOYMENT_LABEL_KEYS, WORK_MODE_LABEL_KEYS } from "@/lib/content/labels";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Experience } from "@/lib/content/types";
import { formatYearMonth, toDateTime } from "@/lib/format";


interface TimelineItemProps {
  item: Experience;
  /** Titles of the case studies that may be linked (drafts are absent outside preview). */
  projectTitles: ReadonlyMap<string, string>;
}

export function TimelineItem({ item, projectTitles }: TimelineItemProps) {
  const ui = getUi();
  const employmentType = known(item.employmentType);
  const details = [
    employmentType && ui[EMPLOYMENT_LABEL_KEYS[employmentType]],
    item.location,
    item.workMode && ui[WORK_MODE_LABEL_KEYS[item.workMode]],
  ].filter(Boolean);
  const stack = item.stack.filter((tech) => known(tech));
  const related = (item.projects ?? []).flatMap((slug) => {
    const title = projectTitles.get(slug);
    return title ? [{ slug, title }] : [];
  });

  return (
    <article className="relative pl-8">
      <span aria-hidden="true" className="absolute left-0 top-2 size-3 -translate-x-1/2 rounded-full border-2 border-accent bg-bg" />
      <p className="text-sm text-muted">
        <time dateTime={toDateTime(item.start)}>{formatYearMonth(item.start)}</time>
        {" – "}
        {item.end === "present" ? ui.present : <time dateTime={toDateTime(item.end)}>{formatYearMonth(item.end)}</time>}
      </p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight">
        {item.role} · <span className="text-accent">{item.company}</span>
      </h3>
      {details.length > 0 && <p className="text-sm text-muted">{details.join(" · ")}</p>}
      <p className="mt-3">{item.summary}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-muted marker:text-border">
        {item.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>
      {stack.length > 0 && (
        <div className="mt-4">
          <TagList items={stack} label={ui.metaStack} />
        </div>
      )}
      {related.map(({ slug, title }) => (
        <p key={slug} className="mt-3 text-sm">
          {ui.relatedCaseStudy}:{" "}
          <Link href={`/projects/${slug}`} className="text-accent underline underline-offset-4 hover:text-accent-strong">
            {title}
          </Link>
        </p>
      ))}
    </article>
  );
}
