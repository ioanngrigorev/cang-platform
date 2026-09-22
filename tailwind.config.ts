import type { Config } from "tailwindcss";

/**
 * CANG design tokens.
 * ink   — deep navy/charcoal used for primary surfaces, headers, primary buttons
 * brass — warm gold accent (Vietnam identity, premium industrial feel) used sparingly for highlights
 * steel — cool neutral greys for text and borders
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
        paper: "rgb(var(--paper) / <alpha-value>)",
        success: { 50: "rgb(var(--jade-50) / <alpha-value>)", 100: "rgb(var(--jade-100) / <alpha-value>)", 500: "rgb(var(--jade-500) / <alpha-value>)", 600: "rgb(var(--jade-600) / <alpha-value>)", 700: "rgb(var(--jade-700) / <alpha-value>)" },
        warning: { 50: "#fffaeb", 100: "#fef0c7", 500: "#f79009", 600: "#dc6803", 700: "#b54708" },
        danger: { 50: "#fef3f2", 100: "#fee4e2", 500: "#f04438", 600: "#d92d20", 700: "#b42318" },
        info: { 50: "#eff8ff", 100: "#d1e9ff", 500: "#2e90fa", 600: "#1570ef", 700: "#175cd3" },
      },
      fontFamily: {
        sans: ["'Inter Variable'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Manrope Variable'", "Manrope", "'Inter Variable'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 27, 45, 0.06), 0 1px 3px rgba(15, 27, 45, 0.08)",
        "card-hover": "0 4px 12px rgba(15, 27, 45, 0.10), 0 2px 4px rgba(15, 27, 45, 0.06)",
        panel: "0 8px 30px rgba(15, 27, 45, 0.12)",
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
