/** Preset Tailwind compartilhado pelos 3 apps. Cada app o aplica via `presets`
 * e define seu próprio `content`. Tema: rosa #ff0080, fontes e sombras do app. */
/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff0080',
          dark: '#c50063',
          light: '#ff40ac',
        },
        surface: '#ffffff',
        background: '#fdf2f8',
      },
      fontFamily: {
        main: ['Montserrat', 'sans-serif'],
        script: ['Dancing Script', 'cursive'],
      },
      boxShadow: {
        'pink-sm': '0 2px 4px rgba(255, 0, 128, 0.05)',
        'pink-md': '0 4px 12px rgba(255, 0, 128, 0.1)',
        'pink-lg': '0 10px 25px rgba(255, 0, 128, 0.15)',
      },
    },
  },
  plugins: [],
}
