import { ExternalLink } from "@/components/ui/ExternalLink";
import { HomeLink } from "@/components/ui/HomeLink";
import { buildInfo } from "@/lib/build-env";
import { getSite, getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import { fill } from "@/lib/content/ui";

/** Footer as a build sheet (visual-direction B5): commit, build date, stack, source, back to top. */
export function SiteFooter() {
  const { builtWith, repoUrl } = getSite();
  const ui = getUi();
  const sourceUrl = known(repoUrl);
  const { commit, date, year } = buildInfo();
  return (
    <footer className="site-meta">
      <div className="ui-container flex flex-wrap items-center gap-x-3 py-(--space-5)">
        <span>
          <code className="text-fg">{commit}</code>
          {date && (
            <>
              {" · "}
              <time dateTime={date}>{date}</time>
            </>
          )}
        </span>
        <span aria-hidden="true">·</span>
        <span>{fill(ui.footerBuiltWith, { builtWith: builtWith.join(", ") })}</span>
        <span aria-hidden="true">·</span>
        <span>{ui.footerDeployed}</span>
        {sourceUrl && (
          <>
            <span aria-hidden="true">·</span>
            <ExternalLink href={sourceUrl} aria-label={ui.footerSourceAria}>
              {ui.footerSource}
              <span aria-hidden="true">&nbsp;↗</span>
            </ExternalLink>
          </>
        )}
        {year && (
          <>
            <span aria-hidden="true">·</span>
            <span>{fill(ui.footerCopyright, { year })}</span>
          </>
        )}
        <span aria-hidden="true">·</span>
        <HomeLink href="/#top">
          <span aria-hidden="true">↑&nbsp;</span>
          {ui.backToTop}
        </HomeLink>
      </div>
    </footer>
  );
}
