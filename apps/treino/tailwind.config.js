import preset from '@emf/shared/tailwind-preset'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    // OBRIGATÓRIO: escaneia os componentes do pacote compartilhado para não
    // purgar as classes deles (Toast, Modal, LoginPage, AuthLayout, spinners).
    '../../packages/shared/src/**/*.{js,jsx,ts,tsx}',
  ],
}
