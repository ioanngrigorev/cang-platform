/**
 * Two themes, one switch. Jade is the light default; Lime is the dark graphite one.
 * The choice lives in a cookie so the very first server render already carries it and
 * nothing flashes, and it is applied as `data-theme` on <html>.
 */

export const THEME_COOKIE = "cang_theme";

export type ThemeId = "jade" | "lime";

export const THEMES = [
  { id: "jade", label: "Jade", labelVi: "Ngọc bích", swatch: "#00A181", scheme: "light" },
  { id: "lime", label: "Lime", labelVi: "Chanh", swatch: "#C6F24E", scheme: "dark" },
] as const satisfies ReadonlyArray<{ id: ThemeId; label: string; labelVi: string; swatch: string; scheme: "light" | "dark" }>;

export const DEFAULT_THEME: ThemeId = "jade";

export function resolveTheme(value: string | null | undefined): ThemeId {
  return THEMES.some((t) => t.id === value) ? (value as ThemeId) : DEFAULT_THEME;
}
