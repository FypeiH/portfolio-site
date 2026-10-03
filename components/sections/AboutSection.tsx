import { Reveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { AVATAR_THUMB_PX, avatarThumbPath } from "@/lib/content/conventions";
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

const subheading = "ui-label text-fg!";

/** Portrait in columns 1–3 (B1, grayscale, hard shadow), text in 5–12. */
export function AboutSection({ profile }: { profile: Profile }) {
  const ui = getUi();
  const note = known(profile.lookingFor.note);
  return (
    <Section id="about" title={ui.aboutTitle}>
      <div className="grid gap-(--space-8) lg:grid-cols-12 lg:gap-x-(--gutter)">
        <Reveal className="lg:col-span-3" variant="fade">
          {profile.avatar && (
            // Plain <img>: a pre-sized 224 px WebP (pnpm avatar); next/image would add client JS.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarThumbPath(profile.avatar.src)}
              alt={profile.avatar.alt}
              width={AVATAR_THUMB_PX}
              height={AVATAR_THUMB_PX}
              loading="lazy"
              decoding="async"
              className="portrait"
            />
          )}
        </Reveal>
        <Reveal className="space-y-4 lg:col-span-8 lg:col-start-5" variant="fade">
          {knownOnly(profile.about).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="ui-panel mt-(--space-6)">
            <h3 className={`${subheading} border-b-2 border-fg px-5 py-3`}>{ui.lookingForTitle}</h3>
            <dl className="ui-ruled border-0">
              {lookingForRows(profile.lookingFor, ui).map((row) => (
                <div key={row.label} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt className="ui-label">{row.label}</dt>
                  <dd className="text-sm">{row.values.join(" · ")}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-border px-5 py-4">
              {note && <p className="mb-4 text-sm text-muted">{note}</p>}
              <ButtonLink href="#contact">{ui.getInTouch}</ButtonLink>
            </div>
          </div>
          <h3 className={`${subheading} pt-(--space-6)`}>{ui.educationTitle}</h3>
          <ul className="space-y-3">
            {profile.education.map((entry) => (
              <li key={entry.degree}>
                <p className="font-semibold">{entry.degree}</p>
                <p className="text-sm text-muted">
                  {entry.institution} · {educationPeriod(entry, ui.present)}
                  {entry.note && ` · ${entry.note}`}
                </p>
              </li>
            ))}
          </ul>
          {profile.languages && (
            <>
              <h3 className={`${subheading} pt-(--space-6)`}>{ui.languagesTitle}</h3>
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
