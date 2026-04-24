/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        jade: {
          50:  '#edfdf8', 100: '#d4faf0', 200: '#a8f4de',
          300: '#5ee8be', 400: '#2dd4a0', 500: '#22a878',
          600: '#1a7a58', 700: '#165c44', 800: '#0f4030',
          900: '#0a2e1f', 950: '#03100a'
        }
      }
    }
  },
  plugins: []
}
