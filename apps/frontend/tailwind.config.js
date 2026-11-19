/** @type {import('tailwindcss').Config} */
const tokens = require('./src/styles/tokens');

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: tokens.colors.primary,
          hover: tokens.colors.primaryHover,
          foreground: tokens.colors.primaryForeground,
        },
        surface: {
          DEFAULT: tokens.colors.surface,
          raised: tokens.colors.surfaceRaised,
          sunken: tokens.colors.surfaceSunken,
        },
        muted: {
          DEFAULT: tokens.colors.muted,
          foreground: tokens.colors.mutedForeground,
        },
        border: {
          DEFAULT: tokens.colors.border,
          strong: tokens.colors.borderStrong,
        },
        foreground: tokens.colors.foreground,
        background: tokens.colors.background,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        danger: tokens.colors.danger,
        info: tokens.colors.info,
      },
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius,
      fontFamily: tokens.fontFamily,
      fontSize: tokens.fontSize,
      keyframes: {
        shimmer: tokens.keyframes.shimmer,
        'fade-in': tokens.keyframes.fadeIn,
        'spin-slow': tokens.keyframes.spinSlow,
      },
      animation: {
        shimmer: tokens.animation.shimmer,
        'fade-in': tokens.animation.fadeIn,
        'spin-slow': tokens.animation.spinSlow,
      },
    },
  },
  plugins: [],
};
