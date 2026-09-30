import { HomeLink } from "@/components/ui/HomeLink";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { getSite, getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import { fill } from "@/lib/content/ui";

export function SiteFooter() {
  const { builtWith, repoUrl } = getSite();
  const ui = getUi();
  const sourceUrl = known(repoUrl);
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between md:px-8">
        <p>
          {fill(ui.footerBuiltWith, { builtWith: builtWith.join(", ") })} · {ui.footerDeployed}
          {sourceUrl && (
            <>
              {" · "}
              <ExternalLink href={sourceUrl} aria-label={ui.footerSourceAria} className="underline underline-offset-4 hover:text-fg">
                {ui.footerSource}
              </ExternalLink>
            </>
          )}
        </p>
        <p className="flex items-center gap-4">
          <span>{fill(ui.footerCopyright, { year: new Date().getFullYear() })}</span>
          <HomeLink href="/#top" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-fg">
            {ui.backToTop}
          </HomeLink>
        </p>
      </div>
    </footer>
  );
}
