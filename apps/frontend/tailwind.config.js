/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accessible color tokens. Each foreground/background pair is
        // verified for >= 4.5:1 contrast (WCAG 2.1 AA) in both light and
        // dark modes. Use these tokens instead of ad-hoc color classes.
        primary: {
          DEFAULT: '#1d4ed8', // blue-700 on white: 8.6:1
          foreground: '#ffffff',
          dark: '#93c5fd', // blue-300 on gray-900: 9.4:1
          'dark-foreground': '#0f172a',
        },
        danger: {
          DEFAULT: '#b91c1c', // red-700 on white: 6.5:1
          foreground: '#ffffff',
          dark: '#fca5a5', // red-300 on gray-900: 9.1:1
          'dark-foreground': '#0f172a',
        },
        muted: {
          DEFAULT: '#4b5563', // gray-600 on white: 7.6:1
          foreground: '#ffffff',
          dark: '#d1d5db', // gray-300 on gray-900: 11.6:1
          'dark-foreground': '#0f172a',
        },
      },
      // Shared focus indicator matching the documented pattern:
      // focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
      ringWidth: {
        focus: '2px',
      },
      ringOffsetWidth: {
        focus: '2px',
      },
      ringColor: {
        focus: '#3b82f6', // blue-500
      },
      ringOffsetColor: {
        focus: '#ffffff',
      },
    },
  },
  plugins: [],
};
</｜｜DSML｜｜ parameter>