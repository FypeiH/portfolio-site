/**
 * Company logos for the Experience timeline, keyed by the company name in content/experience.ts
 * (content/ has no logo field, so the mapping lives in code). Sources and dates: ASSETS.md; files: pnpm logos.
 * A company without an entry gets a typographic mark (initials) instead of a guessed logo.
 */

/**
 * Largest side of a logo inside its 128 px tile, in CSS px; files are written at 1x and 2x of it (2x capped at the
 * master's own size, never upscaled). 112 is the smallest box at which Gigantic's "DIGITAL GROWTH" reads at DPR 1.
 */
export const COMPANY_LOGO_BOX = 112;

/** Master file per logo (scripts/company-logos.ts). */
export const LOGO_FILES: Readonly<Record<string, { master: string }>> = {
  "altyra-solutions": { master: "altyra-solutions.webp" },
  effect: { master: "effect-logo-white.png" },
  "gigantic-digital-growth": { master: "gigantic-logo-yellow.png" },
  "ocr-technology-and-productivity": { master: "ocr-logo-white.png" },
};

export const companyLogoPath = (slug: string, scale: 1 | 2) => `/images/companies/${slug}-${scale}x.webp`;

export interface CompanyLogo {
  slug: string;
  /** Display size in CSS px (the 1x file). */
  width: number;
  height: number;
  /** Shown in its own colours instead of flattened to the foreground grey. */
  keepColours?: boolean;
}

const LOGOS: Readonly<Record<string, CompanyLogo>> = {
  Effect: { slug: "effect", width: 112, height: 32 },
  "Altyra Solutions": { slug: "altyra-solutions", width: 112, height: 59 },
  // Yellow logo, kept in colour on the dark tile at Filipe's request.
  "Gigantic Digital Growth": { slug: "gigantic-digital-growth", width: 112, height: 101, keepColours: true },
  "OCR – Technology and Productivity": { slug: "ocr-technology-and-productivity", width: 112, height: 33 },
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
