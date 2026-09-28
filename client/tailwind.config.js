/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F8FAFC',
        surface: '#FFFFFF',
        elevated: '#FFFFFF',
        inverse: '#0F172A',
        border: '#E2E8F0',
        'border-strong': '#CBD5E1',

        // Text
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        'text-muted': '#94A3B8',
        'text-inverse': '#F8FAFC',

        // Brand & Accents
        brand: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          soft: '#EDE9FE',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        'accent-lime': '#A3E635',
        'accent-amber': '#F59E0B',
        danger: '#EF4444',
        success: '#10B981',

        // Territory 8-color palette
        territory: {
          violet: '#7C3AED',
          cyan: '#06B6D4',
          orange: '#F97316',
          emerald: '#10B981',
          pink: '#EC4899',
          yellow: '#EAB308',
          blue: '#3B82F6',
          red: '#EF4444',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
        md: '0 4px 12px rgba(15, 23, 42, 0.08)',
        lg: '0 12px 32px rgba(15, 23, 42, 0.14)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
