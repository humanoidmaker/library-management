import type { Config } from 'tailwindcss';
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { primary: { DEFAULT: '#92400e' }, accent: { DEFAULT: '#d97706' } }, fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] } } },
  plugins: [],
} satisfies Config;