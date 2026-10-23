/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        island: {
          bg: 'var(--island-bg)',
          surface: 'var(--glass-surface)',
          border: 'var(--glass-border)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          pill: 'var(--pill-bg)',
          ear: 'var(--ear-fill)',
        }
      },
      boxShadow: {
        'liquid-glass': 'var(--glass-shadow)',
      }
    },
  },
  plugins: [],
}
