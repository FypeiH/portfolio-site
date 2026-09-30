import Link from "next/link";
import { getProfile, getSite, getUi } from "@/lib/content/load";
import { SiteNav } from "./SiteNav";

export function SiteHeader() {
  const { nav } = getSite();
  const { name, cv } = getProfile();
  const ui = getUi();
  return (
    <header className="site-header sticky top-0 z-40 h-16 before:absolute before:inset-0 before:-z-10 before:border-b before:border-border before:bg-bg/90 before:backdrop-blur">
      <div className="mx-auto flex h-full max-w-5xl items-center gap-4 px-5 md:px-8">
        <Link href="/#top" aria-label={ui.homeLink} className="inline-flex min-h-11 shrink-0 items-center font-semibold tracking-tight">
          {name}
        </Link>
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
