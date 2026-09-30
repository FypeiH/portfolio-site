// content/profile.ts
// Source of facts: portfolio-input/cv.txt (CV v3, 30/09/2026) + spec §3.5. English only (D11, PM decision).
// Placeholders use the spec's double-brace syntax (detected by lib/content/placeholders.ts) with a "TODO:" prefix.
// NEVER add: phone number, references (PM decision + spec §3.1/§8.2b).
import type { Profile } from "@/lib/content/types";

export const profile = {
  name: "Filipe Bravo",
  role: "Software Engineer · Backend & AI", // PM decision + spec D15 (32 chars, limit 40)

  // ≤ 90 chars. Recommended option A. Alternatives (see NOTES.md):
  //  B: "Software engineer building REST APIs, internal tools and client-facing web apps."
  //  C: "I build the backend side of web products: REST APIs, data exchange and automation."
  tagline: "I build REST APIs, internal tools and automation, with a growing focus on backend and AI.",

  // ≤ 220. From the CV "About".
  intro:
    "Computer Engineering graduate (ISTEC Lisbon) building web applications, REST APIs and internal tools with C#, .NET, Angular, TypeScript, SQL and Azure.",

  location: "Alverca do Ribatejo, Lisbon, Portugal",

  // The CV says "Looking for a software engineering role".
  availability: { status: "open", label: "Open to software engineering roles" },

  lookingFor: {
    // 1st from the CV; 2nd and 3rd from the portfolio focus (PM title). Confirm with Filipe (spec Q-PROCURA).
    roles: ["Software Engineer", "Backend Engineer", "AI Engineer"],
    areas: ["{{TODO: focus area 1, e.g. an industry or problem space (Q-PROCURA)}}"], // 0–5 × ≤ 40; delete the line if none
    // @ts-expect-error TODO placeholder: spec §3.3 tolerates an exact placeholder in enum fields at runtime. Delete this comment when the value is filled.
    workModes: ["{{TODO: remote | hybrid | onsite (one or more) (Q-PROCURA)}}"],
    locations: ["{{TODO: where Filipe wants to work, e.g. city or 'Remote (EU)' (Q-PROCURA)}}"],
    startDate: "{{TODO: earliest start date, or delete this line (Q-PROCURA)}}",
    note: "I want to keep growing through challenging projects, continuous learning and long-term professional development.", // from the CV
  },

  // 2–4 paragraphs × ≤ 350 chars. Facts from the CV.
  about: [
    "I have a Bachelor's Degree in Computer Engineering from ISTEC Lisbon and hands-on experience building web applications, REST APIs, internal tools and client-facing digital products.",
    "I've worked across the stack with C#, .NET, Angular, TypeScript, SQL and Azure, and I also use Python, PHP and modern web technologies.",
    "Before the degree, I completed a Higher Technical Degree (CTeSP) in Mobile App Development (Java, React Native) and an IT Systems Management & Programming course at ESGC, where I received a Merit Award and full marks on my final project.",
    "{{TODO: optional personal note, one or two sentences, ≤ 350 chars. Delete this line if not wanted}}",
  ],

  education: [
    { degree: "Bachelor's Degree in Computer Engineering", institution: "ISTEC Lisbon", start: "2024-10", end: "2026-08" },
    {
      degree: "Higher Technical Degree (CTeSP) in Mobile App Development",
      institution: "ISTEC Lisbon",
      start: "2022-09",
      end: "2024-08",
      note: "Java, React Native and application design.",
    },
    {
      degree: "IT Systems Management & Programming",
      institution: "ESGC",
      start: "2018-09",
      end: "2021-07",
      note: "Merit Award; final project awarded full marks.",
    },
  ],

  // Languages from the CV v3; levels from the CV v2 as recorded in spec §3.5.
  languages: [
    { name: "Portuguese", level: "native" },
    { name: "English", level: "advanced" },
    { name: "Spanish", level: "basic" },
  ],

  email: "filipe.abravo@gmail.com", // from the CV. The phone number is NOT published.

  links: [
    { kind: "github", label: "GitHub", href: "https://github.com/FypeiH" },
    { kind: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/filipe-bravo" },
  ],

  // Public PDF must NOT contain the phone number (spec Q-CV). File still to be supplied.
  cv: { href: "/cv/filipe-bravo-cv.pdf", label: "Resume (PDF)", updatedAt: "2026-09" },

  avatar: { src: "/images/profile/filipe-bravo.webp", alt: "Portrait of Filipe Bravo", width: 640, height: 640 },

  seo: {
    title: "Filipe Bravo · Software Engineer (Backend & AI)", // ≤ 60
    description:
      "Filipe Bravo, software engineer in Lisbon. I build REST APIs, web applications and internal tools with C#, .NET, Angular and Azure. Open to new roles.", // 120–160
  },
} satisfies Profile;
