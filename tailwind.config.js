/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dce7fd',
          200: '#c0d4fb',
          300: '#94b8f8',
          400: '#6192f2',
          500: '#3d6cec',
          600: '#2d4fe0',
          700: '#253dce',
          800: '#2433a7',
          900: '#233084',
          950: '#1a2050',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}