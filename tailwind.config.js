/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',       // green-800 deep forest
          foreground: 'var(--color-primary-foreground)', // white
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',     // gray-600 charcoal
          foreground: 'var(--color-secondary-foreground)', // white
        },
        accent: {
          DEFAULT: 'var(--color-accent)',        // yellow-600 amber gold
          foreground: 'var(--color-accent-foreground)', // gray-900
        },
        background: 'var(--color-background)',   // gray-50 light canvas
        foreground: 'var(--color-foreground)',   // gray-900 near-black
        card: {
          DEFAULT: 'var(--color-card)',          // white
          foreground: 'var(--color-card-foreground)', // gray-900
        },
        popover: {
          DEFAULT: 'var(--color-popover)',       // white
          foreground: 'var(--color-popover-foreground)', // gray-900
        },
        muted: {
          DEFAULT: 'var(--color-muted)',         // gray-100
          foreground: 'var(--color-muted-foreground)', // gray-600
        },
        border: 'var(--color-border)',           // gray-600 20%
        input: 'var(--color-input)',             // gray-600 20%
        ring: 'var(--color-ring)',               // green-800
        success: {
          DEFAULT: 'var(--color-success)',       // green-600
          foreground: 'var(--color-success-foreground)', // white
        },
        warning: {
          DEFAULT: 'var(--color-warning)',       // yellow-600 amber
          foreground: 'var(--color-warning-foreground)', // gray-900
        },
        error: {
          DEFAULT: 'var(--color-error)',         // red-600
          foreground: 'var(--color-error-foreground)', // white
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',   // red-600
          foreground: 'var(--color-destructive-foreground)', // white
        },
        sidebar: {
          DEFAULT: 'var(--color-sidebar)',       // dark forest green
          foreground: 'var(--color-sidebar-foreground)', // gray-200
          muted: 'var(--color-sidebar-muted)',   // gray-200 50%
          active: 'var(--color-sidebar-active)', // green-800
          hover: 'var(--color-sidebar-hover)',   // green-800 60%
          border: 'var(--color-sidebar-border)', // white 8%
        },
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
        caption: ['Inter', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
        sans: ['Source Sans 3', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'h1': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['1.875rem', { lineHeight: '1.25', fontWeight: '600' }],
        'h3': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h4': ['1.25rem', { lineHeight: '1.4', fontWeight: '500' }],
        'h5': ['1.125rem', { lineHeight: '1.5', fontWeight: '500' }],
        'caption': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0.025em' }],
        'data': ['0.875rem', { lineHeight: '1.5' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        'sm': '6px',
        'DEFAULT': '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        'DEFAULT': '0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)',
        'md': '0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)',
        'lg': '0 10px 20px rgba(0,0,0,0.09), 0 4px 8px rgba(0,0,0,0.06)',
        'xl': '0 20px 30px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)',
        '2xl': '0 30px 50px rgba(0,0,0,0.14)',
        'card': '0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.11), 0 4px 8px rgba(0,0,0,0.06)',
        'none': 'none',
      },
      transitionDuration: {
        'base': '250ms',
      },
      transitionTimingFunction: {
        'base': 'ease-out',
      },
      zIndex: {
        'nav': '100',
        'modal': '200',
        'toast': '300',
        'alert': '400',
      },
      width: {
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
      },
      minHeight: {
        'touch': '48px',
      },
      minWidth: {
        'touch': '48px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
};