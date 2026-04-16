export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}', './app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0b2f4a',
        panel: '#114a70',
        card: '#114a70',
        accent: '#ffffff',
        'accent-secondary': '#e2e8f0',
        text: '#ffffff',
        muted: '#cbd5e1',
      },
      boxShadow: {
        glow: '0 8px 30px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
};
