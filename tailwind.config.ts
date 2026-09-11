import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Leto Capital palette — derived from the logo: near-black ground, white wordmark and the olive/lime accent mark.
 * primary  = ink (near-black, slightly green-tinted)   → sidebar, headings, primary buttons
 * accent   = leto green (olive/lime)                   → highlights, active states, key metrics
 * background = warm off-white with a hint of green     → page ground
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1600px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        sidebar: { DEFAULT: "hsl(var(--sidebar))", foreground: "hsl(var(--sidebar-foreground))", muted: "hsl(var(--sidebar-muted))", border: "hsl(var(--sidebar-border))", active: "hsl(var(--sidebar-active))" },
        leto: {
          ink: "#0f1411",
          ink2: "#1b221d",
          green: "#a6b85a",
          "green-dark": "#7f9140",
          "green-deep": "#5c7a2e",
          "green-light": "#e9eed4",
          "green-faint": "#f3f6e8",
          stone: "#6b7266",
          sand: "#f6f7f3",
          line: "#e2e5dc",
        },
        success: "#4f7d2a",
        warning: "#c99a3b",
        danger: "#9a4b4b",
        info: "#3b6b8f",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: { "2xs": ["0.6875rem", { lineHeight: "1rem" }] },
      boxShadow: {
        card: "0 1px 2px rgba(15,20,17,0.04), 0 1px 3px rgba(15,20,17,0.06)",
        pop: "0 8px 24px rgba(15,20,17,0.12)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(2px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { "accordion-down": "accordion-down 0.2s ease-out", "accordion-up": "accordion-up 0.2s ease-out", "fade-in": "fade-in 0.25s ease-out" },
    },
  },
  plugins: [animate],
};

export default config;
