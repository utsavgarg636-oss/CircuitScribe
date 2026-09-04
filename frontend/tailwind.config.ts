import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#080c14",
        surface: "#0e1526",
        "surface-elevated": "#152038",
        border: "#1e2c4a",
        accent: {
          blue: "#38bdf8",
          indigo: "#818cf8",
          emerald: "#34d399",
          amber: "#fbbf24",
          fuchsia: "#c084fc",
          rose: "#fb7185",
        }
      },
      animation: {
        "pulse-fast": "pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(56, 189, 248, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(56, 189, 248, 0.6)" },
        }
      }
    },
  },
  plugins: [],
};

export default config;
