import { getProfile, getUi } from "@/lib/content/load";
import { loadOgAvatar, OG_SIZE, OgFrame, ogColors, ogImageResponse, OgLabel } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = getUi().ogImageAlt;

export default async function OpenGraphImage() {
  const profile = getProfile();
  const avatar = await loadOgAvatar();
  return ogImageResponse(
    "/",
    <OgFrame footer="Portfolio · Case studies · CV">
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, maxWidth: 760 }}>
          <OgLabel>{profile.role}</OgLabel>
          <div style={{ marginTop: 20, fontFamily: "Anton", fontSize: 132, lineHeight: 1, textTransform: "uppercase", letterSpacing: 1 }}>{profile.name}</div>
          <div style={{ marginTop: 28, fontSize: 30, lineHeight: 1.35, color: ogColors.muted }}>{profile.tagline}</div>
        </div>
        <div style={{ display: "flex", marginLeft: 40, marginRight: 8, border: `3px solid ${ogColors.fg}`, boxShadow: `10px 10px 0 0 ${ogColors.accent}` }}>
          <img src={avatar} width={220} height={220} alt="" />
        </div>
      </div>
    </OgFrame>,
  );
}
