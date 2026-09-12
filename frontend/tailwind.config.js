/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: 'var(--color-app)', primary: 'var(--color-primary)', 'primary-hover': 'var(--color-primary-hover)',
        surface: 'var(--color-surface)', 'surface-muted': 'var(--color-surface-muted)',
        border: 'var(--color-border)', 'sidebar': 'var(--color-sidebar)', 'sidebar-hover': 'var(--color-sidebar-hover)',
        'primary-text': 'var(--color-text-primary)', 'secondary-text': 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)', success: 'var(--color-success)', warning: 'var(--color-warning)', danger: 'var(--color-danger)'
      },
      boxShadow: { card: 'var(--shadow-card)', elevated: 'var(--shadow-elevated)' },
      keyframes: {
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        indeterminate: 'indeterminate 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
