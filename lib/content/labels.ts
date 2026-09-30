/** Maps content enums to their UI string keys in site.ui (shared by the timeline and About). */
export const WORK_MODE_LABEL_KEYS = { remote: "modeRemote", hybrid: "modeHybrid", onsite: "modeOnsite" } as const;

export const EMPLOYMENT_LABEL_KEYS = {
  "full-time": "typeFullTime",
  "part-time": "typePartTime",
  internship: "typeInternship",
  freelance: "typeFreelance",
  research: "typeResearch",
} as const;
