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
    <article className="grid gap-x-(--gutter) gap-y-2 py-(--space-3) lg:grid-cols-12">
      <p className="ui-label lg:col-span-3 lg:pt-1.5">
        <time dateTime={toDateTime(item.start)}>{formatYearMonth(item.start)}</time>
        {" — "}
        {item.end === "present" ? ui.present : <time dateTime={toDateTime(item.end)}>{formatYearMonth(item.end)}</time>}
      </p>
      <div className="lg:col-span-9">
        <h3 className="ui-h3">
          {item.role} <span className="text-subtle">·</span> <span className="text-accent">{item.company}</span>
        </h3>
        {details.length > 0 && <p className="ui-micro mt-2 text-subtle">{details.join(" · ")}</p>}
        <p className="mt-3">{item.summary}</p>
        <ul className="mt-3 list-[square] space-y-1 pl-5 text-muted marker:text-accent">
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
            <span className="text-muted">{ui.relatedCaseStudy}:</span>{" "}
            <Link href={`/projects/${slug}`} className="ui-link">
              {title}
            </Link>
          </p>
        ))}
      </div>
    </article>
  );
}
