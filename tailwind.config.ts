import type { Config } from "tailwindcss";

/**
 * ARKVIUM Tailwind yapılandırması.
 *
 * Renkler ve gölgeler `src/app/globals.css` içindeki CSS değişkenlerinden
 * gelir; burada yalnızca isimlendirilirler. Böylece tek kaynak korunur ve
 * bileşenlerde hex değeri elle yazılmaz (bkz. DESIGN.md § 3).
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        ark: {
          ink: "var(--ark-ink)",
          "ink-2": "var(--ark-ink-2)",
          "ink-3": "var(--ark-ink-3)",
          accent: "var(--ark-accent)",
          "accent-strong": "var(--ark-accent-strong)",
          "accent-soft": "var(--ark-accent-soft)",
          commerce: "var(--ark-commerce)",
          "commerce-strong": "var(--ark-commerce-strong)",
          surface: "var(--ark-surface)",
          "surface-2": "var(--ark-surface-2)",
          "surface-3": "var(--ark-surface-3)",
          line: "var(--ark-line)",
          "line-strong": "var(--ark-line-strong)",
        },
      },

      /** Gölge ölçeği — DESIGN.md § 7. Üç seviye vardır, dördüncüsü eklenmez. */
      boxShadow: {
        "ark-1": "0 1px 2px rgb(16 26 61 / 0.06)",
        "ark-2": "0 4px 16px rgb(16 26 61 / 0.08)",
        "ark-3": "0 12px 32px rgb(16 26 61 / 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
