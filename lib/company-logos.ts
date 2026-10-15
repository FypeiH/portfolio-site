/**
 * Company logos for the Experience timeline, keyed by the company name in content/experience.ts
 * (content/ has no logo field, so the mapping lives in code). Sources and dates: ASSETS.md.
 * A company without an entry gets a typographic mark (initials) instead of a guessed logo.
 */
export interface CompanyLogo {
  src: string;
  width: number;
  height: number;
}

const LOGOS: Readonly<Record<string, CompanyLogo>> = {
  // Official logo from altyra.com (PNG 166×87, converted to lossless WebP).
  "Altyra Solutions": { src: "/images/companies/altyra-solutions.webp", width: 166, height: 87 },
  // Official logo from gigantic.pt, yellow background made transparent (the CSS filter needs an alpha mask).
  "Gigantic Digital Growth": { src: "/images/companies/gigantic-digital-growth.webp", width: 160, height: 147 },
};

export function companyLogo(company: string): CompanyLogo | undefined {
  return LOGOS[company];
}

/** Up to two initials from the words that start with a letter: "Gigantic Digital Growth" -> "GD". */
export function companyInitials(company: string): string {
  return company
    .split(/\s+/)
    .filter((word) => /^\p{L}/u.test(word))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}
