import { HomeLink } from "@/components/ui/HomeLink";
import { getProfile, getSite, getUi } from "@/lib/content/load";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  const { nav } = getSite();
  const { name, cv } = getProfile();
  const ui = getUi();
  return (
    <header className="site-header sticky top-0 z-40 h-16 before:absolute before:inset-0 before:-z-10 before:border-b-2 before:border-fg before:bg-bg">
      <div className="ui-container flex h-full items-center gap-4">
        <HomeLink href="/#top" aria-label={ui.homeLink} className="ui-label inline-flex min-h-11 shrink-0 items-center font-bold text-fg!">
          {name}
        </HomeLink>
        <SiteNav
          items={nav}
          cv={{ href: cv.href, label: cv.label }}
          labels={{
            nav: ui.navLabel,
            menuOpen: ui.menuOpen,
            menuClose: ui.menuClose,
            resume: ui.resume,
            pdfSuffix: ui.pdfSuffix,
            newTab: ui.externalLink,
          }}
        />
      </div>
    </header>
  );
}
