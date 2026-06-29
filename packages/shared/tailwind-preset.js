/** Preset Tailwind compartilhado pelos 3 apps. Cada app o aplica via `presets`
 * e define seu próprio `content`. Tema: rosa de marca #ff0080 + lavanda de acento.
 * Cores neutras/superfícies são dirigidas por CSS variables (ver index.css) para
 * suportar dark mode via classe `.dark` em <html>. */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Marca — idêntica nos dois temas.
        primary: {
          DEFAULT: '#ff0080',
          dark: '#c50063',
          light: '#ff40ac',
        },
        // Acento lavanda (var-driven, suaviza no dark).
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          light: 'rgb(var(--secondary-light) / <alpha-value>)',
        },
        // Tokens semânticos (flipam entre claro/escuro).
        background: 'rgb(var(--background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
        },
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        content: {
          DEFAULT: 'rgb(var(--content) / <alpha-value>)',
          muted: 'rgb(var(--content-muted) / <alpha-value>)',
          subtle: 'rgb(var(--content-subtle) / <alpha-value>)',
        },
      },
      fontFamily: {
        main: ['Montserrat', 'sans-serif'],
        script: ['Dancing Script', 'cursive'],
      },
      boxShadow: {
        'pink-sm': '0 2px 4px rgba(255, 0, 128, 0.05)',
        'pink-md': '0 4px 12px rgba(255, 0, 128, 0.1)',
        'pink-lg': '0 10px 25px rgba(255, 0, 128, 0.15)',
        soft: '0 1px 2px rgba(17, 12, 46, 0.04), 0 4px 16px rgba(17, 12, 46, 0.06)',
        'soft-lg': '0 4px 12px rgba(17, 12, 46, 0.06), 0 18px 40px rgba(17, 12, 46, 0.10)',
        glass: '0 8px 32px rgba(17, 12, 46, 0.12)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
