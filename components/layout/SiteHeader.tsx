import { HomeLink } from "@/components/ui/HomeLink";
import { getProfile, getSite, getUi } from "@/lib/content/load";
import { Monogram } from "./Monogram";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  const { nav } = getSite();
  const { name, cv } = getProfile();
  const ui = getUi();
  return (
    <header className="site-header sticky top-0 z-40 h-16 before:absolute before:inset-0 before:-z-10 before:border-b-2 before:border-fg before:bg-bg">
      <div className="site-header-bar ui-container flex h-full items-center gap-4">
        <HomeLink href="/#top" aria-label={ui.homeLink} className="ui-label inline-flex min-h-11 min-w-0 items-center gap-3 font-bold text-fg!">
          <Monogram className="site-monogram" />
          <span className="site-name">{name}</span>
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
