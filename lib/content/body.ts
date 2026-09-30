export interface BodyStats {
  words: number;
  sections: number;
}

/** Rules from spec §3.6, narrowed by the PM: only featured case studies need the full format. */
export const BODY_RULES = {
  featured: { minWords: 300, minSections: 6 },
  standard: { minWords: 0, minSections: 3 },
  maxWords: 1200,
} as const;

const FRONTMATTER = /^---\n[\s\S]*?\n---\n?/;
const PLACEHOLDER_CODE = /`\{\{[^}]+\}\}`/g;
const JSX_TAG = /<\/?[A-Z][^>]*>/g;
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/g;
const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’.\-/]*/gu;

/** Counts prose words (placeholders, JSX and link targets excluded) and `##` sections of an MDX file. */
export function analyzeBody(mdx: string): BodyStats {
  const body = mdx.replace(FRONTMATTER, "");
  const prose = body.replace(PLACEHOLDER_CODE, " ").replace(JSX_TAG, " ").replace(MARKDOWN_LINK, "$1");
  return {
    words: prose.match(WORD)?.length ?? 0,
    sections: body.split("\n").filter((line) => /^## \S/.test(line)).length,
  };
}

export function bodyProblems({ words, sections }: BodyStats, featured: boolean): string[] {
  const rule = featured ? BODY_RULES.featured : BODY_RULES.standard;
  const kind = featured ? "featured" : "non-featured";
  return [
    ...(words < rule.minWords ? [`${words} words; ${kind} case studies need at least ${rule.minWords}`] : []),
    ...(words > BODY_RULES.maxWords ? [`${words} words; the maximum is ${BODY_RULES.maxWords}`] : []),
    ...(sections < rule.minSections ? [`${sections} sections; ${kind} case studies need at least ${rule.minSections}`] : []),
  ];
}
