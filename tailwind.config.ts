import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Leto Capital palette — taken from the brand assets: black ground, white wordmark and the lime mark (#bfdf85).
 * primary  = ink (black)                       → sidebar, headings, primary buttons
 * accent   = leto lime                         → highlights, active states, key metrics (black text on top)
 * green-deep = darker lime for text on light   → eyebrows, links, positive numbers
 * background = off-white with a hint of lime   → page ground
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
          ink: "#050505",
          ink2: "#161616",
          green: "#bfdf85",
          "green-pale": "#c9eda2",
          "green-dark": "#9cc45a",
          "green-deep": "#587f28",
          "green-light": "#e3f2c8",
          "green-faint": "#f2f8e6",
          stone: "#6b6f66",
          sand: "#f7f8f4",
          line: "#e3e6de",
        },
        success: "#587f28",
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
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)",
        pop: "0 8px 24px rgba(0,0,0,0.14)",
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
