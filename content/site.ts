// content/site.ts
// Site config + every UI string (English only for v1, PM decision).
// String conventions (see portfolio-copy/tom-de-voz.md):
//   - Sentence case. Buttons are verbs. No full stop on labels/buttons; full stop on sentences.
//   - `{name}` single braces = runtime value interpolated by the component (NOT a placeholder).
//   - double-brace "TODO:" markers = content placeholders; they block the production build (CONTENT_STRICT).
import type { SiteConfig } from "@/lib/content/types";

export const site = {
  // Canonical URL is not content: lib/site-url.ts reads NEXT_PUBLIC_SITE_URL, then VERCEL_PROJECT_PRODUCTION_URL (PM decision).
  locale: "en",

  // 5 items: "Demo" is removed because the AI demo is out of v1 (PM decision; spec §1.2 allows it when demoSection = false).
  nav: [
    { id: "projects", label: "Projects" },
    { id: "experience", label: "Experience" },
    { id: "skills", label: "Skills" },
    { id: "about", label: "About" },
    { id: "contact", label: "Contact" },
  ],

  // AI demo is Phase B (PM decision). Section not rendered in v1.
  features: { demoSection: false },

  repoUrl: "https://github.com/FypeiH/portfolio-site", // TODO (non-blocking): confirm once the repo is created
  builtWith: ["Next.js", "Tailwind CSS"],

  // Phase B only. Left empty on purpose: no copy for the demo in v1 (PM decision).
  demo: { suggestedQuestions: [], examples: [] },

  ui: {
    // ---------- Global / accessibility ----------
    skipToContent: "Skip to content",
    navLabel: "Primary", // aria-label on <nav>
    homeLink: "Filipe Bravo, back to top", // aria-label on the header name link
    menuOpen: "Menu", // visible text on the mobile button (spec §2.5)
    menuClose: "Close",
    resume: "Resume",
    pdfSuffix: "(PDF)",
    externalLink: "(opens in new tab)", // sr-only suffix
    backToTop: "Back to top",
    photoAlt: "Portrait of Filipe Bravo", // mirror of profile.avatar.alt, for the OG image

    // ---------- Hero ----------
    heroCtaProjects: "View projects",
    heroCtaContact: "Contact me",
    heroGithub: "GitHub profile", // aria-label on icon link
    heroLinkedin: "LinkedIn profile",
    heroResume: "Resume (PDF)",

    // ---------- Projects ----------
    projectsTitle: "Selected projects",
    projectsIntro: "What I built, the problem behind it and the trade-offs I made.",
    readCaseStudy: "Read case study",
    source: "Source", // spec §3.4 (exact)
    liveDemo: "Live demo",
    appStore: "App Store", // label for links.store (e.g. Benched)
    docs: "Docs",
    privateProject: "Private project", // spec §3.4 (exact)
    ndaProject: "Under NDA", // spec §3.4 (exact)
    privateNote: "Proprietary code. Architecture and impact are described in the case study.", // spec §3.4 (exact)
    moreOnGithub: "More on GitHub",
    projectsEmpty: "Case studies are on the way. In the meantime, my code is on GitHub.",
    roleIndividual: "Solo project",
    roleTeam: "Team of {teamSize}",
    metricProduction: "Production",
    metricAcademic: "Academic",
    metricPersonal: "Personal project",
    metricBenchmark: "Benchmark",

    // ---------- Experience ----------
    experienceTitle: "Experience",
    present: "Present",
    typeFullTime: "Full-time",
    typePartTime: "Part-time",
    typeInternship: "Internship",
    typeFreelance: "Freelance",
    typeResearch: "Research",
    modeRemote: "Remote",
    modeHybrid: "Hybrid",
    modeOnsite: "On-site",
    relatedCaseStudy: "Related case study",

    // ---------- Skills ----------
    skillsTitle: "Skills",
    skillsIntro: "Tools I've used at work, in my degree and in personal projects.",
    skillSeeIn: "See it in {project}", // link from a skill to its case study

    // ---------- About + Now looking for ----------
    aboutTitle: "About",
    lookingForTitle: "Now looking for",
    lookingRoles: "Roles",
    lookingAreas: "Areas",
    lookingWorkModes: "Work mode",
    lookingLocations: "Location",
    lookingStart: "Start",
    educationTitle: "Education",
    languagesTitle: "Languages",
    levelNative: "Native",
    levelAdvanced: "Advanced",
    levelIntermediate: "Intermediate",
    levelBasic: "Basic",
    getInTouch: "Get in touch",

    // ---------- Contact ----------
    contactTitle: "Contact",
    contactHeading: "Let's talk.",
    contactIntro: "Hiring for a software engineering role? Email is the fastest way to reach me.",
    emailLabel: "Email",
    copyEmail: "Copy", // visible button text
    copyEmailAria: "Copy email address",
    copied: "Copied", // feedback, aria-live="polite"
    copyFailed: "Couldn't copy. Select the address and copy it manually.",
    downloadResume: "Download resume",
    linkedin: "LinkedIn",
    github: "GitHub",

    // ---------- Case study ----------
    allProjects: "All projects", // BackLink (spec §2.7)
    onThisPage: "On this page",
    metaOrganization: "Context",
    metaRole: "Role",
    metaPeriod: "Period",
    metaStack: "Stack",
    metaLinks: "Links",
    impactLabel: "Impact",
    problemLabel: "Problem",
    solutionLabel: "Solution",
    whyNoCode: "Why no code?", // callout title on private/nda projects (spec §3.4)
    disclaimerLabel: "Note",
    diagramLabel: "Architecture diagram",
    updatedOn: "Updated {date}",
    previousProject: "Previous project",
    nextProject: "Next project",
    caseStudyCtaTitle: "Want to talk about this project?",
    caseStudyCta: "Get in touch",

    // ---------- Footer ----------
    footerBuiltWith: "Built with {builtWith}", // e.g. "Built with Next.js, Tailwind CSS"
    footerDeployed: "Deployed on Vercel",
    footerSource: "Source",
    footerSourceAria: "Source code for this site",
    footerCopyright: "© {year} Filipe Bravo",

    // ---------- 404 (spec §2.8) ----------
    notFoundTitle: "Page not found",
    notFoundBody: "This page doesn't exist or has moved. Try one of these instead:",
    notFoundHome: "Home",
    notFoundProjects: "Projects",
    notFoundContact: "Contact",

    // ---------- Generic error (not in spec §5.1 tree; for app/error.tsx if added) ----------
    errorTitle: "Something went wrong",
    errorBody: "The problem is on my side, not yours. Try again, or come back in a few minutes.",
    errorRetry: "Try again",
    errorHome: "Go to homepage",

    // ---------- Loading / images ----------
    loading: "Loading…",
    imageError: "Image didn't load.",

    // ---------- Metadata / SEO ----------
    metaNotFoundTitle: "Page not found", // → "Page not found · Filipe Bravo" via title template
    metaErrorTitle: "Something went wrong",
    ogImageAlt: "Filipe Bravo, Software Engineer · Backend & AI",
    ogProjectAlt: "{title}: case study by Filipe Bravo",

    // ---------- Preview mode only (SHOW_DRAFTS=true); never rendered in production ----------
    draftBadge: "Draft",

    // ---------- AI demo (Phase B). OPTIONAL, not rendered while demoSection = false ----------
    demoComingSoon: "AI demo coming soon.",
  },
} satisfies SiteConfig;
