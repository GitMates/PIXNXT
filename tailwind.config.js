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
        display: [
          'Fraunces',
          'Noto Serif Devanagari',
          'Georgia',
          'serif',
        ],
        sans: [
          'Plus Jakarta Sans',
          'Jakarta Fallback',
          'Noto Sans Devanagari',
          'Noto Sans Tamil',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        heading: ['Fraunces', 'Georgia', 'serif'],
      },
      fontSize: {
        'display-lg': ['2.125rem', { lineHeight: '1.15', letterSpacing: '-0.018em' }],
        'display-md': ['1.5rem', { lineHeight: '1.15', letterSpacing: '-0.018em' }],
        'display-sm': ['1.25rem', { lineHeight: '1.15', letterSpacing: '-0.018em' }],
        title: ['1rem', { lineHeight: '1.3', letterSpacing: '-0.005em' }],
        'body-lg': ['0.9375rem', { lineHeight: '1.5' }],
        body: ['0.875rem', { lineHeight: '1.5' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5' }],
        meta: ['0.75rem', { lineHeight: '1.45' }],
        micro: ['0.6875rem', { lineHeight: '1.45' }],
        label: ['0.625rem', { lineHeight: '1.2', letterSpacing: '0.12em' }],
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
        ink: {
          DEFAULT: '#1c1917',
          body: '#3f3a36',
          muted: '#8a8580',
        },
        canvas: {
          DEFAULT: '#f7f6f3',
          surface: '#ffffff',
          border: '#e5e2dc',
        },
        studio: {
          accent: '#9a6c67',
          revision: '#c46a3a',
          awaiting: '#b08968',
          approved: '#5f8f6a',
          draft: '#9a9590',
        },
        sidebar: {
          DEFAULT: "oklch(0.972 0.006 85)",
          foreground: "oklch(0.45 0.004 60)",
          border: "oklch(0.905 0.007 82)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
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
