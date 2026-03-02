/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        /* ===== BRAND CORE ===== */
        brand: {
          green: "#1DB954",
          black: "#191414",
          white: "#FFFFFF",
        },

        /* ===== PRIMARY (Spotify Green System) ===== */
        primary: {
          DEFAULT: "#1DB954",
          hover: "#1AA34A",
          active: "#178F40",
        },

        /* ===== DARK SYSTEM ===== */
        dark: {
          DEFAULT: "#191414",
          card: "#1E1A1A",
          elevated: "#242020",
          soft: "#2E2A2A",
          muted: "#3A3535",
        },

        /* ===== BACKGROUND SYSTEM ===== */
        background: {
          main: "#191414",
          secondary: "#121212",
          elevated: "#242020",
        },

        /* ===== TEXT SYSTEM ===== */
        text: {
          primary: "#FFFFFF",
          secondary: "#B3B3B3",
          muted: "#8A8A8A",
          inverse: "#191414",
        },

        /* ===== BORDER SYSTEM ===== */
        border: {
          subtle: "#2A2A2A",
          strong: "#3A3A3A",
        },

        /* ===== STATUS COLORS ===== */
        success: {
          DEFAULT: "#1DB954",
        },
        warning: {
          DEFAULT: "#F59E0B",
        },
        danger: {
          DEFAULT: "#E02424",
        },
      },
    },
  },
  plugins: [],
}