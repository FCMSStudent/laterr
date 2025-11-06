import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
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
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      /**
       * Typography Scale
       * Establishes a consistent type scale across the application
       * - Font sizes range from text-xs (0.75rem) to text-5xl (3rem)
       * - Each size includes appropriate line-height for optimal readability
       * - Responsive typography: headings scale down on mobile devices
       */
      fontSize: {
        // Base text sizes with optimal line heights
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0em' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0em' }],  // 14px
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0em' }],     // 16px - body text
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0em' }],  // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }], // 20px
        
        // Display text sizes with tighter line heights and letter spacing for headings
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],     // 24px - h6
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }], // 30px - h5
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],   // 36px - h4
        '5xl': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],        // 48px - h3
        '6xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],      // 60px - h2
        '7xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.03em' }],       // 72px - h1
      },
      /**
       * Line Height Scale
       * Defines line heights for different text contexts
       * - Headings use tighter line heights (1.1-1.2)
       * - Body text uses comfortable line heights (1.5-1.75)
       */
      lineHeight: {
        'heading': '1.15',     // For large display text
        'subheading': '1.3',   // For section headings
        'body': '1.6',         // For paragraphs and body text
        'relaxed': '1.75',     // For comfortable reading
      },
      /**
       * Maximum widths for optimal readability
       * Limits text blocks to 65-75 characters for best reading experience
       */
      maxWidth: {
        'prose': '65ch',       // ~65 characters - ideal for body text
        'prose-narrow': '55ch', // ~55 characters - for side content
        'prose-wide': '75ch',   // ~75 characters - maximum for readability
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
