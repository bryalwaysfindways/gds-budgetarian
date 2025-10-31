/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e53e3e', // red-600
          hover: '#c53030', // red-700
        },
        secondary: {
          DEFAULT: '#ecc94b', // yellow-400
          hover: '#d69e2e', // yellow-500
        }
      },
    },
  },
  plugins: [],
};
