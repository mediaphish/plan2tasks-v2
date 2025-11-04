/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FAFAF9',
          100: '#F5F3F0',
        },
        charcoal: {
          600: '#374151',
          700: '#2D3748',
          800: '#1F2937',
        },
        bronze: {
          600: '#8B6F47',
          700: '#6B5435',
        },
      },
    },
  },
  plugins: [],
}
