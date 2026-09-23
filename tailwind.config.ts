import type { Config } from "tailwindcss";

/**
 * CANG design tokens.
 * Palette "chợ & lụa" (market & silk): a warm, light ground carrying saturated Vietnamese accents,
 * so the page reads festive at a glance while the data itself stays black on white.
 * ink   — warm near-black (lacquer) for text and dark surfaces
 * brass — marigold gold for highlights and badges
 * steel — warm greige neutrals for muted text and borders
 * lac   — flag red, the primary action colour
 * jade  — verification, success, logistics
 * lotus — sparing decorative accent
 * paper — the warm ground the whole site sits on
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", md: "1.5rem", xl: "2rem" },
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        ink: { 50: "rgb(var(--ink-50) / <alpha-value>)", 100: "rgb(var(--ink-100) / <alpha-value>)", 200: "rgb(var(--ink-200) / <alpha-value>)", 300: "rgb(var(--ink-300) / <alpha-value>)", 400: "rgb(var(--ink-400) / <alpha-value>)", 500: "rgb(var(--ink-500) / <alpha-value>)", 600: "rgb(var(--ink-600) / <alpha-value>)", 700: "rgb(var(--ink-700) / <alpha-value>)", 800: "rgb(var(--ink-800) / <alpha-value>)", 900: "rgb(var(--ink-900) / <alpha-value>)", 950: "rgb(var(--ink-950) / <alpha-value>)" },
        brass: { 50: "rgb(var(--brass-50) / <alpha-value>)", 100: "rgb(var(--brass-100) / <alpha-value>)", 200: "rgb(var(--brass-200) / <alpha-value>)", 300: "rgb(var(--brass-300) / <alpha-value>)", 400: "rgb(var(--brass-400) / <alpha-value>)", 500: "rgb(var(--brass-500) / <alpha-value>)", 600: "rgb(var(--brass-600) / <alpha-value>)", 700: "rgb(var(--brass-700) / <alpha-value>)", 800: "rgb(var(--brass-800) / <alpha-value>)", 900: "rgb(var(--brass-900) / <alpha-value>)" },
        steel: { 50: "rgb(var(--steel-50) / <alpha-value>)", 100: "rgb(var(--steel-100) / <alpha-value>)", 200: "rgb(var(--steel-200) / <alpha-value>)", 300: "rgb(var(--steel-300) / <alpha-value>)", 400: "rgb(var(--steel-400) / <alpha-value>)", 500: "rgb(var(--steel-500) / <alpha-value>)", 600: "rgb(var(--steel-600) / <alpha-value>)", 700: "rgb(var(--steel-700) / <alpha-value>)", 800: "rgb(var(--steel-800) / <alpha-value>)", 900: "rgb(var(--steel-900) / <alpha-value>)" },
        lac: { 50: "rgb(var(--lac-50) / <alpha-value>)", 100: "rgb(var(--lac-100) / <alpha-value>)", 200: "rgb(var(--lac-200) / <alpha-value>)", 300: "rgb(var(--lac-300) / <alpha-value>)", 400: "rgb(var(--lac-400) / <alpha-value>)", 500: "rgb(var(--lac-500) / <alpha-value>)", 600: "rgb(var(--lac-600) / <alpha-value>)", 700: "rgb(var(--lac-700) / <alpha-value>)", 800: "rgb(var(--lac-800) / <alpha-value>)", 900: "rgb(var(--lac-900) / <alpha-value>)" },
        jade: { 50: "rgb(var(--jade-50) / <alpha-value>)", 100: "rgb(var(--jade-100) / <alpha-value>)", 200: "rgb(var(--jade-200) / <alpha-value>)", 300: "rgb(var(--jade-300) / <alpha-value>)", 400: "rgb(var(--jade-400) / <alpha-value>)", 500: "rgb(var(--jade-500) / <alpha-value>)", 600: "rgb(var(--jade-600) / <alpha-value>)", 700: "rgb(var(--jade-700) / <alpha-value>)", 800: "rgb(var(--jade-800) / <alpha-value>)", 900: "rgb(var(--jade-900) / <alpha-value>)" },
        lotus: { 50: "rgb(var(--lotus-50) / <alpha-value>)", 100: "rgb(var(--lotus-100) / <alpha-value>)", 200: "rgb(var(--lotus-200) / <alpha-value>)", 300: "rgb(var(--lotus-300) / <alpha-value>)", 400: "rgb(var(--lotus-400) / <alpha-value>)", 500: "rgb(var(--lotus-500) / <alpha-value>)", 600: "rgb(var(--lotus-600) / <alpha-value>)", 700: "rgb(var(--lotus-700) / <alpha-value>)", 800: "rgb(var(--lotus-800) / <alpha-value>)", 900: "rgb(var(--lotus-900) / <alpha-value>)" },
        brand: { 50: "rgb(var(--brand-50) / <alpha-value>)", 100: "rgb(var(--brand-100) / <alpha-value>)", 200: "rgb(var(--brand-200) / <alpha-value>)", 300: "rgb(var(--brand-300) / <alpha-value>)", 400: "rgb(var(--brand-400) / <alpha-value>)", 500: "rgb(var(--brand-500) / <alpha-value>)", 600: "rgb(var(--brand-600) / <alpha-value>)", 700: "rgb(var(--brand-700) / <alpha-value>)", 800: "rgb(var(--brand-800) / <alpha-value>)", 900: "rgb(var(--brand-900) / <alpha-value>)" },
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        inverse: "rgb(var(--inverse) / <alpha-value>)",
        hairline: "rgb(var(--hairline) / <alpha-value>)",
        "on-brand": "rgb(var(--on-brand) / <alpha-value>)",
        success: { 50: "rgb(var(--brand-50) / <alpha-value>)", 100: "rgb(var(--brand-100) / <alpha-value>)", 500: "rgb(var(--brand-500) / <alpha-value>)", 600: "rgb(var(--brand-600) / <alpha-value>)", 700: "rgb(var(--brand-700) / <alpha-value>)" },
        warning: { 50: "rgb(var(--warning-50) / <alpha-value>)", 100: "rgb(var(--warning-100) / <alpha-value>)", 500: "rgb(var(--warning-500) / <alpha-value>)", 600: "rgb(var(--warning-600) / <alpha-value>)", 700: "rgb(var(--warning-700) / <alpha-value>)" },
        danger: { 50: "rgb(var(--danger-50) / <alpha-value>)", 100: "rgb(var(--danger-100) / <alpha-value>)", 500: "rgb(var(--danger-500) / <alpha-value>)", 600: "rgb(var(--danger-600) / <alpha-value>)", 700: "rgb(var(--danger-700) / <alpha-value>)" },
        info: { 50: "rgb(var(--info-50) / <alpha-value>)", 100: "rgb(var(--info-100) / <alpha-value>)", 500: "rgb(var(--info-500) / <alpha-value>)", 600: "rgb(var(--info-600) / <alpha-value>)", 700: "rgb(var(--info-700) / <alpha-value>)" },
      },
      fontFamily: {
        sans: ["'Inter Variable'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Manrope Variable'", "Manrope", "'Inter Variable'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(12, 21, 18, 0.06), 0 1px 3px rgba(12, 21, 18, 0.08)",
        "card-hover": "0 4px 12px rgba(12, 21, 18, 0.10), 0 2px 4px rgba(12, 21, 18, 0.06)",
        panel: "0 8px 30px rgba(12, 21, 18, 0.12)",
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
