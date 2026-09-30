import { ImageResponse } from "next/og";
import { getProfile, getUi } from "@/lib/content/load";
import { loadOgAvatar, loadOgFonts, OG_SIZE, OgFrame, ogColors } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = getUi().ogImageAlt;

export default async function OpenGraphImage() {
  const profile = getProfile();
  const [fonts, avatar] = await Promise.all([loadOgFonts(), loadOgAvatar()]);
  return new ImageResponse(
    (
      <OgFrame>
        <img src={avatar} width={160} height={160} alt="" style={{ borderRadius: 9999, border: `2px solid ${ogColors.border}` }} />
        <div style={{ marginTop: 40, fontSize: 76, fontWeight: 700 }}>{profile.name}</div>
        <div style={{ marginTop: 8, fontSize: 36, color: ogColors.accent }}>{profile.role}</div>
        <div style={{ marginTop: 28, fontSize: 30, color: ogColors.muted, maxWidth: 900 }}>{profile.tagline}</div>
      </OgFrame>
    ),
    { ...OG_SIZE, fonts },
  );
}
