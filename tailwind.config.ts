import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand-500, 205 71 0) / <alpha-value>)',
          50: 'rgb(var(--brand-50, 255 245 235) / <alpha-value>)',
          100: 'rgb(var(--brand-100, 255 232 209) / <alpha-value>)',
          200: 'rgb(var(--brand-200, 255 201 153) / <alpha-value>)',
          300: 'rgb(var(--brand-300, 255 165 92) / <alpha-value>)',
          400: 'rgb(var(--brand-400, 224 90 0) / <alpha-value>)',
          500: 'rgb(var(--brand-500, 205 71 0) / <alpha-value>)',
          600: 'rgb(var(--brand-600, 168 59 0) / <alpha-value>)',
          700: 'rgb(var(--brand-700, 131 46 0) / <alpha-value>)',
        },
        warm: {
          DEFAULT: '#7C7066',
          50: '#F5F3F1',
          100: '#EBE8E5',
          200: '#D4CFC9',
          300: '#B5ADA4',
          400: '#968C82',
          500: '#7C7066',
          600: '#635952',
          700: '#4A433E',
          800: '#332E2A',
          900: '#1C1917',
        },
      },
    },
  },
  plugins: [],
}
export default config
