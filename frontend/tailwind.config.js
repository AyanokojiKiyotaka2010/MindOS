/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182230",
        muted: "#667085",
        canvas: "#f7f8fc",
        brand: "#6558d3"
      },
      boxShadow: {
        soft: "0 8px 30px rgba(23, 31, 56, 0.06)"
      }
    }
  },
  plugins: []
};
