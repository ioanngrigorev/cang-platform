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
        ink: {
          50: "#f4f6fa",
          100: "#e6eaf2",
          200: "#c9d2e3",
          300: "#a1b0cb",
          400: "#7288ad",
          500: "#4f6892",
          600: "#3d5279",
          700: "#324262",
          800: "#2b3852",
          900: "#0f1b2d",
          950: "#0a1220",
        },
        brass: {
          50: "#fdf9ec",
          100: "#faf0c9",
          200: "#f4de8e",
          300: "#edc653",
          400: "#e5ae2b",
          500: "#d4941a",
          600: "#b87314",
          700: "#935414",
          800: "#7a4317",
          900: "#673818",
        },
        steel: {
          50: "#f7f8fa",
          100: "#eef0f3",
          200: "#dfe3e9",
          300: "#c8cfd8",
          400: "#a3adbb",
          500: "#7d899a",
          600: "#5f6b7c",
          700: "#4b5565",
          800: "#3b4350",
          900: "#2c323b",
        },
        success: { 50: "#ecfdf3", 100: "#d1fadf", 500: "#12b76a", 600: "#039855", 700: "#027a48" },
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
