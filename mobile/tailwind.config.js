/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        agrilearn: {
          green: '#164B35',
          light: '#F8F8F3',
          gold: '#D6A84B',
        },
      },
    },
  },
  plugins: [],
};
