/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crust: '#11111b',
        mantle: '#181825',
        base: '#1e1e2e',
        surface0: '#313244',
        text: '#cdd6f4',
        subtext0: '#a6adc8',
        lavender: '#b4befe',
        green: '#a6e3a1',
        peach: '#fab387',
      }
    },
  },
  plugins: [],
}
