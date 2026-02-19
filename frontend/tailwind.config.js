/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        mainTheme: "#122436",
        mildTheme: "#12243650",
        whiteTheme: "#FFFFFF",
        CD_Blue: "#3BA9FB"
      },
    },
  },
  plugins: [],
}

