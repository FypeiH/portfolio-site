import { companyInitials, companyLogo, companyLogoPath } from "@/lib/company-logos";

/**
 * 128 px tile under the dates: the official logo (monochrome unless it keeps its colours) when there is one,
 * otherwise the initials. Both are decorative: the h3 beside them already names the company (spelled as in
 * content/experience.ts, never as in a wordmark), so the logo has an empty alt and the initials are aria-hidden.
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
          alt=""
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
