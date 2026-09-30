// content/experience.ts
// Most recent first. Facts from portfolio-input/cv.txt + spec §3.5. Bullets are the CV's, lightly edited.
// Optional fields not filled (unknown, so omitted rather than guessed): companyUrl, workMode.
import type { Experience } from "@/lib/content/types";

export const experience = [
  {
    id: "gigantic",
    company: "Gigantic Digital Growth",
    role: "Web Developer Intern",
    employmentType: "internship",
    location: "Lisbon",
    start: "2026-03",
    end: "2026-06",
    summary: "Delivered client-facing websites for brands across different industries.",
    highlights: [
      "Built and customized WordPress pages and components with Elementor.",
      "Implemented responsive layouts and content-driven UI updates.",
    ],
    stack: ["WordPress", "Elementor"],
  },
  {
    id: "altyra",
    company: "Altyra Solutions",
    role: "Fullstack Developer",
    // @ts-expect-error TODO placeholder: spec §3.3 tolerates an exact placeholder in enum fields at runtime. Delete this comment when the value is filled.
    employmentType: "{{TODO: full-time | part-time | freelance (Q-CONTRATO)}}",
    location: "Lisbon",
    start: "2024-03",
    end: "2025-02",
    summary: "Built and maintained web and mobile application features across client projects.",
    // Source: CV + portfolio-input/altyra-projects.md (4 projects). 1–3 bullets (spec §1.1). No numbers: the source has none.
    // Client names (TakeFreeTours, Benched, Ramos Correia & Associados) pending the NDA check: {{TODO: confirm client names can be published (NDA check)}}
    highlights: [
      "Built an email scraper (C#, Gmail API) that turns booking confirmations from several platforms into validated visitor records, drastically reducing manual entry.",
      "Developed the frontend and API for a tour and guide-availability web app (Angular, .NET) and for Benched, a football mobile app (.NET MAUI, Blazor).",
      "Integrated PayPal payments into a law firm's services website, now live in production.",
    ],
    stack: ["C#", ".NET", ".NET MAUI", "Blazor", "Angular", "TypeScript", "PayPal API", "Gmail API"],
    projects: ["email-scraper", "takefreetours", "benched"],
  },
  {
    id: "ocr",
    company: "OCR – Technology and Productivity",
    role: "Frontend Developer Intern",
    employmentType: "internship",
    location: "Lisbon",
    start: "2021-03",
    end: "2021-07",
    summary: "Customized ERP workflows and features in the PHC Web platform.",
    highlights: [
      "Improved a logistics application built with Kalipso Studio.",
      "Fixed bugs, shipped feature updates and handled application support.",
    ],
    stack: ["PHC Web", "Kalipso Studio"],
  },
] satisfies Experience[];
