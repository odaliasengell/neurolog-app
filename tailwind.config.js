/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 20%, 50%, 80%, 100%': { transform: 'translateY(0)' },
          '40%': { transform: 'translateY(-3px)' },
          '60%': { transform: 'translateY(-1px)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      screens: {
        'xs': '475px',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionProperty: {
        'width': 'width',
        'spacing': 'margin, padding',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Plugin personalizado para utilidades específicas de NeuroLog
    function({ addUtilities, theme }) {
      const newUtilities = {
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.gradient-neurolog': {
          'background': `linear-gradient(135deg, ${theme('colors.blue.500')}, ${theme('colors.purple.600')})`,
        },
        '.gradient-neurolog-light': {
          'background': `linear-gradient(135deg, ${theme('colors.blue.50')}, ${theme('colors.purple.50')})`,
        },
        '.section-padding': {
          'padding-top': theme('spacing.12'),
          'padding-bottom': theme('spacing.12'),
          '@screen sm': {
            'padding-top': theme('spacing.16'),
            'padding-bottom': theme('spacing.16'),
          },
          '@screen lg': {
            'padding-top': theme('spacing.20'),
            'padding-bottom': theme('spacing.20'),
          },
        },
        '.card-padding': {
          'padding': theme('spacing.4'),
          '@screen sm': {
            'padding': theme('spacing.6'),
          },
        },
        '.interactive': {
          'transition': 'all 200ms ease-in-out',
          '&:hover': {
            'transform': 'scale(1.02)',
          },
          '&:active': {
            'transform': 'scale(0.98)',
          },
        },
        '.skeleton': {
          'background-color': theme('colors.muted.DEFAULT'),
          'border-radius': theme('borderRadius.DEFAULT'),
          'animation': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
      }
      
      addUtilities(newUtilities)
    },
    // Plugin para debugging (solo en desarrollo)
    function({ addUtilities }) {
      if (process.env.NODE_ENV === 'development') {
        const debugUtilities = {
          '.debug-red': {
            'border': '2px solid red',
            'background-color': 'rgba(255, 0, 0, 0.1)',
          },
          '.debug-blue': {
            'border': '2px solid blue',
            'background-color': 'rgba(0, 0, 255, 0.1)',
          },
          '.debug-green': {
            'border': '2px solid green',
            'background-color': 'rgba(0, 255, 0, 0.1)',
          },
        }
        
        addUtilities(debugUtilities)
      }
    },
  ],
}