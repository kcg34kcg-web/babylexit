import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // DÜZELTME: hsl() fonksiyonları kaldırıldı, doğrudan değişken kullanıldı.
        border: "var(--card-border)", 
        input: "var(--card-border)",
        ring: "var(--accent)",
        background: "var(--background)",
        foreground: "var(--foreground)",

        primary: {
          DEFAULT: "var(--foreground)",
          foreground: "var(--background)",
        },
        secondary: {
          DEFAULT: "var(--muted-bg)",
          foreground: "var(--foreground)",
        },
        destructive: {
          DEFAULT: "#ef4444", // Varsayılan kırmızı
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "var(--muted-bg)",
          foreground: "#94a3b8",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--foreground)",
        },
        card: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--foreground)",
        },

        /* 🔥 LEXWOOW ÖZEL RENKLERİ */
        lexwoow: {
          start: "#FF6B6B",
          end: "#FF8E53",
          neon: "#FF5E92",
          violet: "#7c3aed",
          fuchsia: "#c026d3",
        },
        gold: {
          star: "#FFD700",
        },
      },

      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-from-top-2": {
          from: { transform: "translateY(-0.5rem)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        /* ✨ ARKA PLAN İKONLARI İÇİN KEYFRAMES */
        floatUp: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "0" },
          "20%": { opacity: "0.15" },
          "80%": { opacity: "0.15" },
          "100%": { transform: "translateY(-100vh) rotate(20deg)", opacity: "0" },
        },
        "bounce-slight": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 10px rgba(255, 107, 107, 0.5)",
          },
          "50%": {
            opacity: "0.8",
            boxShadow: "0 0 20px rgba(255, 142, 83, 0.8)",
          },
        },
      },

      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-from-top-2": "slide-in-from-top-2 0.3s ease-out",
        
        /* ✨ YENİ ANİMASYONLAR */
        "floating-icons": "floatUp 20s linear infinite",
        "bounce-slight": "bounce-slight 0.4s ease-out",
        "pulse-glow": "pulse-glow 2s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
