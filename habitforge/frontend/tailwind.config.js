/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "#fafaf9",
        ink: "#0c0a09",
        border: "#e7e5e4",
        muted: "#78716c",
      },
    },
  },
  plugins: [],
};
