/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        foreground: '#0F172A',
        purple: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          DEFAULT: '#7C3AED',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2E1065',
        },
        darkblue: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          500: '#334E68',
          700: '#1E3A8A',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
      },
    },
  },
  plugins: [],
}
