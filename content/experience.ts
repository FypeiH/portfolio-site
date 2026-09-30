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
  // Altyra Solutions: two entries (spec Experience has one employmentType per entry).
  // Source: CV + portfolio-input/altyra-projects.md ("Autorização e dados do relatório de estágio").
  // Real client names authorized by Filipe. Confidentiality agreement: no screenshots or internal code.
  {
    id: "altyra",
    company: "Altyra Solutions",
    role: "Fullstack Developer",
    // @ts-expect-error TODO placeholder: spec §3.3 tolerates an exact placeholder in enum fields at runtime. Delete this comment when the value is filled.
    employmentType: "{{TODO: contract type after the internship: full-time | part-time | freelance (not confirmed in the source)}}",
    location: "Lisbon",
    start: "2024-09", // internship ended Aug 2024; the source says he then stayed on until Feb 2025
    end: "2025-02",
    summary: "Stayed on after my internship, on flexible hours alongside the start of my degree, building web and mobile features for client projects.",
    // {{TODO: confirm the Email Scraper was built after the internship (Sep 2024 – Feb 2025). If it was during the internship, move this bullet, the project link and the Gmail API tag to "altyra-internship" and set experienceId in email-scraper.mdx}}
    highlights: [
      "Built an email scraper for TakeFreeTours (C#, Gmail API) that turns booking confirmations from several platforms into validated visitor records, drastically reducing manual entry.",
    ],
    stack: ["C#", ".NET", "Gmail API"],
    projects: ["email-scraper"],
  },
  {
    id: "altyra-internship",
    company: "Altyra Solutions",
    role: "Fullstack Developer Intern",
    employmentType: "internship",
    location: "Lisbon",
    start: "2024-03",
    end: "2024-08",
    summary: "Six-month curricular internship (800 hours) for my CTeSP at an IT consultancy of about 8 people, working across frontend and backend.",
    // 1–3 bullets (spec §1.1). No numbers where the source has none.
    highlights: [
      "Built the frontend and REST API for TakeFreeTours' tour management system (Angular, .NET), my first Angular project.",
      "Developed the frontend and API for Benched, a multi-platform football app built with .NET MAUI and a Blazor UI in C#.",
      "Integrated PayPal payments into the Ramos Correia & Associados law firm website (Angular, .NET), now live in production.",
    ],
    stack: ["C#", ".NET", "Angular", "TypeScript", ".NET MAUI", "Blazor", "SQL", "Tailwind CSS", "Angular Material", "Syncfusion", "PayPal API", "Azure DevOps"],
    projects: ["takefreetours", "benched"],
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
