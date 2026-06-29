export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "x"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "whatsapp"
  | "snapchat";

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export const SOCIAL_PLATFORMS: {
  key: SocialPlatform;
  label: string;
  placeholder: string;
}[] = [
  { key: "instagram", label: "Instagram", placeholder: "instagram.com/yourbusiness" },
  { key: "facebook", label: "Facebook", placeholder: "facebook.com/yourbusiness" },
  { key: "x", label: "X (Twitter)", placeholder: "x.com/yourbusiness" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/yourbusiness" },
  { key: "youtube", label: "YouTube", placeholder: "youtube.com/@yourbusiness" },
  { key: "tiktok", label: "TikTok", placeholder: "tiktok.com/@yourbusiness" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "wa.me/9715XXXXXXXX" },
  { key: "snapchat", label: "Snapchat", placeholder: "snapchat.com/add/yourbusiness" },
];

function withHttps(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function normaliseWhatsApp(raw: string): string {
  if (/^https?:\/\//i.test(raw) || raw.includes("wa.me") || raw.includes("whatsapp.com")) {
    return withHttps(raw);
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) return withHttps(raw);
  return `https://wa.me/${digits}`;
}

export function normaliseSocialUrl(platform: SocialPlatform, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (platform === "whatsapp") return normaliseWhatsApp(trimmed);
  return withHttps(trimmed);
}

export function socialLinksFromForm(
  entries: Iterable<[string, FormDataEntryValue]>,
): SocialLinks | null {
  const links: SocialLinks = {};
  for (const [key, value] of entries) {
    if (!key.startsWith("social_") || typeof value !== "string") continue;
    const platform = key.slice("social_".length) as SocialPlatform;
    if (!SOCIAL_PLATFORMS.some((p) => p.key === platform)) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    links[platform] = normaliseSocialUrl(platform, trimmed);
  }
  return Object.keys(links).length > 0 ? links : null;
}

export function hasSocialLinks(links: SocialLinks | null | undefined): links is SocialLinks {
  return Boolean(links && Object.values(links).some(Boolean));
}
