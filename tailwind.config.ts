import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // WVRN Brand — Gold on Deep Navy
        gold: {
          DEFAULT: '#FFD700',
          50:  '#FFFDE0',
          100: '#FFF9B3',
          200: '#FFF380',
          300: '#FFEC4D',
          400: '#FFE21A',
          500: '#FFD700',
          600: '#CCAC00',
          700: '#997F00',
          800: '#665500',
          900: '#332A00',
        },
        navy: {
          DEFAULT: '#0A0618',
          50:  '#EEEDF8',
          100: '#CCCAF0',
          200: '#9A97E0',
          300: '#6864D1',
          400: '#3631C2',
          500: '#1E1A9E',
          600: '#151278',
          700: '#0D0B52',
          800: '#0A0618',
          900: '#06040F',
        },
        violet: {
          DEFAULT: '#A78BFA',
          50:  '#F5F3FF',
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
        // Theme-aware surface colors (used via CSS vars)
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        border: 'var(--border)',
        accent: 'var(--accent)',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn .2s ease',
        'slide-up': 'slideUp .25s ease',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
