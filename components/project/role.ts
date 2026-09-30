import { known } from "@/lib/content/placeholders";
import type { Project } from "@/lib/content/types";
import { fill, type UiStrings } from "@/lib/content/ui";

export function roleLabel(project: Project, ui: UiStrings): string | undefined {
  const role = known(project.role);
  if (role === "individual") return ui.roleIndividual;
  if (role === "team") return project.teamSize ? fill(ui.roleTeam, { teamSize: project.teamSize }) : project.roleNote;
  return undefined;
}
