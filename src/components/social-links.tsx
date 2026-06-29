import type { SocialLinks, SocialPlatform } from "@/lib/social-links";
import { SOCIAL_PLATFORMS, hasSocialLinks } from "@/lib/social-links";

export function SocialLinkIcons({
  links,
  className,
}: {
  links: SocialLinks | null | undefined;
  className?: string;
}) {
  if (!hasSocialLinks(links)) return null;

  const items = SOCIAL_PLATFORMS.filter((p) => links[p.key]);

  return (
    <div className={className ?? "flex flex-wrap gap-2"}>
      {items.map((p) => (
        <a
          key={p.key}
          href={links[p.key]!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={p.label}
          title={p.label}
          className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-canvas text-muted transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600"
        >
          <SocialIcon platform={p.key} />
        </a>
      ))}
    </div>
  );
}

function SocialIcon({ platform }: { platform: SocialPlatform }) {
  switch (platform) {
    case "instagram":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm-5 3.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM18 6.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
        </svg>
      );
    case "facebook":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M14 3h-2.2C9.5 3 8 4.6 8 7.2V10H5.5v3.5H8V21h3.5v-7.5H15l.5-3.5h-3.5V7.8c0-.9.2-1.3 1.3-1.3H15V3z" />
        </svg>
      );
    case "x":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.9 3H22l-6.8 7.8L23 21h-6.6l-5.2-6.8L5.4 21H2.3l7.3-8.4L1 3h6.8l4.7 6.2L18.9 3zm-1.2 16.2h1.8L7.1 4.8H5.2l12.5 14.4z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6.5 8.5h3v11h-3v-11zM8 4a1.75 1.75 0 1 1 0 3.5A1.75 1.75 0 0 1 8 4zm4.5 4.5h2.9v1.5h.04c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.6V19.5h-3v-5.2c0-1.2 0-2.8-1.7-2.8-1.7 0-2 1.3-2 2.7v5.3h-3v-11z" />
        </svg>
      );
    case "youtube":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.5 12 4.5 12 4.5s-5.8 0-7.6.7a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.8.7 7.6.7 7.6.7s5.8 0 7.6-.7a2.8 2.8 0 0 0 2-2c.3-1.6.4-3.2.4-4.8s-.1-3.2-.4-4.8zM10 15.5V8.5l6 3.5-6 3.5z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.5 3h-2.7c.2 1.9 1.3 3.7 3 4.7V10c-1.4 0-2.7-.5-3.8-1.3v5.8a5.2 5.2 0 1 1-5.2-5.2c.3 0 .6 0 .9.1v2.8a2.4 2.4 0 1 0 1.7 2.3V3z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.7 15l-1.3 4.8 4.9-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 6.8 12.2l.2.3-.8 3.1-3.2-.8-.3.2A8 8 0 1 1 12 4zm4.6 11.2c-.2-.1-1.3-.6-1.5-.7-.2-.1-.4-.1-.5.1-.2.2-.6.7-.7.9-.1.1-.3.2-.5.1-.2-.1-.9-.3-1.7-1-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4.1-.1.2-.3.3-.4.1-.1.1-.2.2-.3.1-.1 0-.2 0-.3 0-.1-.5-1.3-.7-1.8-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.5.3-.2.2-.7.7-.7 1.7 0 1 .7 2 1 2.3.3.3 1.7 2.6 4.1 3.6.6.2 1 .4 1.4.5.6.2 1.1.2 1.5.1.5-.1 1.3-.5 1.5-1 .2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2z" />
        </svg>
      );
    case "snapchat":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2c2.2 0 4.5.6 5.8 1.7.9.8 1.4 1.9 1.3 3.2-.1 1.4-.9 2.5-2.1 3.1.3.5.7 1 1.2 1.3 1 .6 2.2.5 3.1-.2.5-.4 1.1-.1 1.2.5.1.5-.2 1-.7 1.2-1.2.5-2.6.7-4 .5-.1.6-.2 1.2-.4 1.8-.3 1.3-1.1 2.4-2.2 3.1-1.5 1-3.5 1.3-5.2.7-1.7-.6-2.9-2-3.2-3.7-.2-.6-.3-1.2-.4-1.8-1.4.2-2.8 0-4-.5-.5-.2-.8-.7-.7-1.2.1-.6.7-.9 1.2-.5.9.7 2.1.8 3.1.2.5-.3.9-.8 1.2-1.3-1.2-.6-2-1.7-2.1-3.1-.1-1.3.4-2.4 1.3-3.2C7.5 2.6 9.8 2 12 2z" />
        </svg>
      );
  }
}
