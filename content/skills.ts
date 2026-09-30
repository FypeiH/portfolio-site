// content/skills.ts
// Only what the CV, the public repos or Filipe's Altyra project list (altyra-projects.md) prove (spec §3.5). No percentage bars, no levels.
// `projects` links a skill to the case study that shows it (slugs must exist).
import type { SkillGroup } from "@/lib/content/types";

export const skills = [
  {
    id: "backend",
    label: "Backend",
    items: [
      { name: "C#", projects: ["email-scraper", "takefreetours"] },
      { name: ".NET", projects: ["email-scraper", "takefreetours"] },
      { name: "Python", projects: ["fidu-bot"] },
      { name: "Node.js" },
      { name: "REST APIs", projects: ["takefreetours"] },
      { name: "SQL" },
      { name: "PHP" },
      { name: "PayPal API" }, // Altyra (law firm website); experience only, no case study
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
      { name: "WordPress / Elementor" },
    ],
  },
  {
    id: "infra-devops",
    label: "Cloud & tools",
    items: [{ name: "Azure" }, { name: "Git" }],
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
  // { id: "ai-ml", label: "AI / ML", items: [] },
  // Optional (not a build blocker): uncomment only with real AI/ML evidence from Filipe (spec Q-IA).
] satisfies SkillGroup[];
