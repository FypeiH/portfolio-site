import { companyInitials, companyLogo } from "@/lib/company-logos";

/** Display size of the logo inside the 56 px tile; the aspect ratio of the source file is kept. */
const LOGO_WIDTH = 40;

/**
 * Square tile next to the company: the official logo in monochrome when there is one, otherwise the
 * initials. Both are decorative (empty alt, aria-hidden): the company name is in the heading right next to it.
 */
export function CompanyMark({ company }: { company: string }) {
  const logo = companyLogo(company);
  return (
    <div className="company-mark" data-company-mark={logo ? "logo" : "initials"}>
      {logo ? (
        // Plain <img>: tiny pre-sized WebP; next/image would add client JS for nothing.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo.src}
          alt=""
          width={LOGO_WIDTH}
          height={Math.round((LOGO_WIDTH * logo.height) / logo.width)}
          loading="lazy"
          decoding="async"
          className="company-logo"
        />
      ) : (
        <span aria-hidden="true" className="ui-label">
          {companyInitials(company)}
        </span>
      )}
    </div>
  );
}
