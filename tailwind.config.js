/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          900: '#0d2b1a',
          800: '#123821',
          700: '#1a4d2e',
          600: '#236337',
        },
      },
    },
  },
  plugins: [],
};
