// content/skills.ts
// Only what the CV, the public repos or Filipe's Altyra project list (altyra-projects.md) prove (spec §3.5). No percentage bars, no levels.
// `projects` links a skill to the case study that shows it (slugs must exist).
import type { SkillGroup } from "@/lib/content/types";

export const skills = [
  {
    id: "backend",
    label: "Backend",
    items: [
      { name: "C# / .NET", projects: ["email-scraper", "takefreetours"] }, // merged (rev. 6) to make room for the AI group within 25
      { name: "Python", projects: ["fidu-bot"] },
      { name: "Node.js" },
      { name: "REST APIs", projects: ["takefreetours"] },
      { name: "SQL / SQL Server", projects: ["email-scraper"] },
      { name: "PHP" },
      { name: "PayPal API" }, // Altyra (law firm website); experience only, no case study
    ],
  },
  {
    // Evidence (rev. 6, "Outras respostas do Filipe"): degree AI course, Hugging Face AI Agents Course certificate
    // (full certification in progress) and the agent workflow that built this site. Keep notes exact; no overclaiming.
    id: "ai-ml",
    label: "AI",
    items: [
      {
        name: "AI agents",
        note: "Hugging Face AI Agents Course certificate (full certification in progress); agent workflow behind this site",
        projects: ["portfolio-site"],
      },
      { name: "AI fundamentals", note: "Theoretical Artificial Intelligence course in my degree" },
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    items: [
      { name: "Angular", projects: ["dynamic-cv", "takefreetours"] },
      { name: "TypeScript", projects: ["dynamic-cv", "takefreetours"] },
      { name: "Blazor", projects: ["benched"] },
      { name: "React" },
      { name: "HTML5 / CSS3" },
      { name: "Tailwind CSS", projects: ["dynamic-cv"] },
      { name: "Angular Material / Syncfusion", projects: ["dynamic-cv"] }, // UI component libraries; Syncfusion from the Altyra internship. Merged (rev. 6)
      // "WordPress / Elementor" removed to stay within 25 items (spec); still shown in the Gigantic experience stack.
    ],
  },
  {
    id: "infra-devops",
    label: "Cloud & tools",
    items: [{ name: "Azure / Azure DevOps" }, { name: "Git" }], // Azure DevOps (project management, CI/CD) from the Altyra internship, merged to stay within 25
  },
  {
    id: "mobile",
    label: "Mobile",
    items: [{ name: ".NET MAUI", projects: ["benched"] }, { name: "React Native" }, { name: "Java" }], // React Native + Java from the CTeSP
  },
  {
    id: "data-automation",
    label: "Data & automation",
    items: [
      { name: "NumPy", projects: ["fidu-bot"] },
      { name: "TA-Lib", projects: ["fidu-bot"] },
      { name: "CCXT", projects: ["fidu-bot"] },
      { name: "Gmail API", projects: ["email-scraper"] },
    ],
  },
] satisfies SkillGroup[];
