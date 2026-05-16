/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Lora', 'serif'],
        display: ['Outfit', 'sans-serif'],
        heading: ['Playfair Display', 'serif'],
      },
      keyframes: {
        cgFadeIn: {
          'from': { opacity: '0', transform: 'translateY(-4px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        cgSlideUp: {
          'from': { opacity: '0', transform: 'translateX(-50%) translateY(20px)' },
          'to': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        }
      },
      animation: {
        'fadeIn': 'fadeIn 0.15s ease',
        'cgFadeIn': 'cgFadeIn 0.15s ease',
        'cgSlideUp': 'cgSlideUp 0.2s ease',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        brand: {
          DEFAULT: "#000000",
          foreground: "#ffffff",
          muted: "#71717a",
          subtle: "#f4f4f5",
        },
      },
      letterSpacing: {
        tightest: '-.075em',
        tighter: '-.05em',
        tight: '-.025em',
        normal: '0',
        wide: '.025em',
        wider: '.05em',
        widest: '.25em',
      },
    },
  },
  plugins: [],
};
