/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: {
          50:  '#fff8ed',
          100: '#feecd0',
          200: '#fcd5a0',
          300: '#f9b665',
          400: '#f5922e',
          500: '#e87010',
          600: '#c95609',
          700: '#a33f0b',
          800: '#833310',
          900: '#6a2b11',
        },
        earth: {
          50:  '#fdf7f0',
          100: '#f5e8d7',
          200: '#e8c9a6',
          300: '#d4a374',
          400: '#bf834a',
          500: '#a66830',
          600: '#8a5226',
          700: '#6e3f1d',
          800: '#552f16',
          900: '#421f0e',
        },
        cream: '#fefdf9',
        'deep-green': '#1a3c34',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
