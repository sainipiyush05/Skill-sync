/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F172A',
          dark: '#0B1120',
          light: '#1E293B',
        },
        secondary: '#1E293B',
        accent: {
          DEFAULT: '#6366F1',
          dark: '#4F46E5',
          light: '#818CF8',
        },
        error: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
        // Platform-specific colors
        github: '#2dba4e',
        linkedin: '#0077b5',
        leetcode: '#ffa116',
        codechef: '#5b4638',
        hackerrank: '#00ea64',
        // Status colors
        info: '#3b82f6',
      },
      fontFamily: {
        // Modern, clean fonts that work well for code
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'sm': '0.125rem',
        DEFAULT: '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(99, 102, 241, 0.3)',
        'inner-glow': 'inset 0 1px 3px 0 rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
      },
      backdropBlur: {
        xs: '2px',
      },
      gradientColorStops: theme => ({
        ...theme('colors'),
      }),
    },
  },
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
} 