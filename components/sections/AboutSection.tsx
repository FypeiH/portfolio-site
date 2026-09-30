import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { WORK_MODE_LABEL_KEYS } from "@/lib/content/labels";
import { getUi } from "@/lib/content/load";
import { known } from "@/lib/content/placeholders";
import type { Profile } from "@/lib/content/types";
import type { UiStrings } from "@/lib/content/ui";
import { formatPeriod, formatYearMonth } from "@/lib/format";

const LEVEL_LABEL_KEYS = { native: "levelNative", advanced: "levelAdvanced", intermediate: "levelIntermediate", basic: "levelBasic" } as const;

const knownOnly = (values: readonly string[] | undefined) => (values ?? []).flatMap((value) => known(value) ?? []);

function lookingForRows(lookingFor: Profile["lookingFor"], ui: UiStrings) {
  const workModes = lookingFor.workModes.flatMap((mode) => {
    const value = known(mode);
    return value ? [ui[WORK_MODE_LABEL_KEYS[value]]] : [];
  });
  const startDate = known(lookingFor.startDate);
  return [
    { label: ui.lookingRoles, values: knownOnly(lookingFor.roles) },
    { label: ui.lookingAreas, values: knownOnly(lookingFor.areas) },
    { label: ui.lookingWorkModes, values: workModes },
    { label: ui.lookingLocations, values: knownOnly(lookingFor.locations) },
    { label: ui.lookingStart, values: startDate ? [startDate] : [] },
  ].filter((row) => row.values.length > 0);
}

function educationPeriod({ start, end }: Profile["education"][number], presentLabel: string): string {
  if (start) return formatPeriod(start, end, presentLabel);
  return end === "present" ? presentLabel : formatYearMonth(end);
}

export function AboutSection({ profile }: { profile: Profile }) {
  const ui = getUi();
  const note = known(profile.lookingFor.note);
  return (
    <Section id="about" title={ui.aboutTitle}>
      <div className="grid gap-12 md:grid-cols-5">
        <Reveal className="ui-card p-6 md:col-span-2">
          <h3 className="text-lg font-semibold tracking-tight">
            {ui.lookingForTitle}
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            {lookingForRows(profile.lookingFor, ui).map((row) => (
              <div key={row.label}>
                <dt className="text-muted">{row.label}</dt>
                <dd className="mt-0.5">{row.values.join(" · ")}</dd>
              </div>
            ))}
          </dl>
          {note && <p className="mt-4 text-sm text-muted">{note}</p>}
          <ButtonLink href="#contact" className="mt-6">
            {ui.getInTouch}
          </ButtonLink>
        </Reveal>
        <Reveal className="space-y-4 md:col-span-3" variant="fade">
          {knownOnly(profile.about).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <h3 className="pt-6 text-lg font-semibold tracking-tight">{ui.educationTitle}</h3>
          <ul className="space-y-3">
            {profile.education.map((entry) => (
              <li key={entry.degree}>
                <p className="font-medium">{entry.degree}</p>
                <p className="text-sm text-muted">
                  {entry.institution} · {educationPeriod(entry, ui.present)}
                  {entry.note && ` · ${entry.note}`}
                </p>
              </li>
            ))}
          </ul>
          {profile.languages && (
            <>
              <h3 className="pt-6 text-lg font-semibold tracking-tight">{ui.languagesTitle}</h3>
              <p className="text-muted">
                {profile.languages.map((language) => `${language.name} (${ui[LEVEL_LABEL_KEYS[language.level]]})`).join(" · ")}
              </p>
            </>
          )}
        </Reveal>
      </div>
    </Section>
  );
}
