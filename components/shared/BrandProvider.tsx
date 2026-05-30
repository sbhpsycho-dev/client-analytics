"use client";

function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return "99 102 241";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

// Injects CSS variables derived from the tenant's brand color so all
// accent-colored components reference var(--brand) / var(--brand-rgb).
export function BrandProvider({
  brandColor,
  children,
}: {
  brandColor: string;
  children: React.ReactNode;
}) {
  const color = /^#[0-9a-f]{6}$/i.test(brandColor) ? brandColor : "#6366f1";
  const rgb = hexToRgb(color);

  return (
    <div
      style={{
        "--brand": color,
        "--brand-rgb": rgb,
      } as React.CSSProperties}
      className="contents"
    >
      {children}
    </div>
  );
}
