/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        noctal: {
          slate: '#111111',
          dark: '#2A2A2A',
          charcoal: '#303030',
          silver: '#C0C0C0',
          blue: '#3B82F6', 
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}