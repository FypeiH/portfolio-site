import { companyInitials, companyLogo, companyLogoPath } from "@/lib/company-logos";

/**
 * 64 px tile under the dates: the official logo (monochrome unless it keeps its colours) when there is one,
 * otherwise the initials. The logo alt names the company ("OCR – Technology and Productivity logo"), spelled as in
 * content/experience.ts, never as in a wordmark; the initials are decorative (aria-hidden).
 */
export function CompanyMark({ company }: { company: string }) {
  const logo = companyLogo(company);
  return (
    <div className="company-mark" data-company-mark={logo ? "logo" : "initials"}>
      {logo ? (
        // Plain <img>: tiny pre-sized WebPs (pnpm logos); next/image would add client JS for nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={companyLogoPath(logo.slug, 1)}
          srcSet={`${companyLogoPath(logo.slug, 1)} 1x, ${companyLogoPath(logo.slug, 2)} 2x`}
          alt={`${company} logo`}
          width={logo.width}
          height={logo.height}
          loading="lazy"
          decoding="async"
          className={logo.keepColours ? "company-logo" : "company-logo company-logo-mono"}
        />
      ) : (
        <span aria-hidden="true" className="ui-label">
          {companyInitials(company)}
        </span>
      )}
    </div>
  );
}
