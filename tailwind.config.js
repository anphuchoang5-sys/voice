/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./App.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: "#0F0F1A",
        violetDeep: "#6C3CE1",
        violetSoft: "#A78BFA",
      },
    },
  },
  plugins: [],
};
