import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bark: {
          50:  "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
        paw: {
          50:  "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#f0abfc",
          400: "#e879f9",
          500: "#d946ef",
          600: "#c026d3",
          700: "#a21caf",
          800: "#86198f",
          900: "#701a75",
        },
        bone: {
          50:  "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
      },
      fontFamily: {
        display: ["'Bangers'", "cursive"],
        body: ["'Nunito'", "sans-serif"],
      },
      animation: {
        "bark-pulse": "barkPulse 0.3s ease-in-out",
        "shake": "shake 0.5s ease-in-out",
        "float": "float 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "bark-wave": "barkWave 1s ease-in-out infinite",
        "victory-pop": "victoryPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up": "slideUp 0.4s ease-out",
        "bounce-in": "bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        barkPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px #f97316, 0 0 10px #f97316" },
          "100%": { boxShadow: "0 0 20px #f97316, 0 0 40px #f97316, 0 0 60px #f97316" },
        },
        barkWave: {
          "0%, 100%": { scaleY: "0.5", opacity: "0.5" },
          "50%": { scaleY: "1", opacity: "1" },
        },
        victoryPop: {
          "0%": { transform: "scale(0)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        bounceIn: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      backgroundImage: {
        "bark-gradient": "linear-gradient(135deg, #1c1917 0%, #292524 50%, #1a0a00 100%)",
        "arena-gradient": "radial-gradient(ellipse at center, #3d1a00 0%, #1c1917 70%)",
        "card-gradient": "linear-gradient(145deg, rgba(41,37,36,0.9), rgba(28,25,23,0.95))",
      },
    },
  },
  plugins: [],
};

export default config;
