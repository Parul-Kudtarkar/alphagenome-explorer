import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "#FF2D78",
          purple: "#9B6DFF",
          blue: "#4A90D9",
          teal: "#5AC8C8",
        },
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(90deg, #FF2D78 0%, #9B6DFF 35%, #4A90D9 65%, #5AC8C8 100%)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
