/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`])),
borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 10px)',
  			'3xl': 'calc(var(--radius) + 18px)',
  			arch: '9999px 9999px 0 0'
  		},
  		boxShadow: {
  			/* Layered ambient + key light. Warm brown at low alpha reads as
  			   daylight through a window rather than a generic grey drop. */
  			'warm': '0 1px 2px rgba(74,50,34,0.04), 0 10px 30px -12px rgba(74,50,34,0.18)',
  			'gold': '0 2px 4px rgba(74,50,34,0.06), 0 8px 24px -8px hsl(32 46% 56% / 0.40)',
  			/* Hover lift for interactive cards — deeper and warmer than `warm`. */
  			'lift': '0 2px 4px rgba(74,50,34,0.05), 0 18px 40px -16px rgba(74,50,34,0.26)',
			/* Barely-there inner rim, gives cream cards a lit edge. */

			/* Soft pool of warm light, for hero panels. */
			'glow': '0 24px 70px -28px hsl(32 46% 46% / 0.55)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
/* Warm material palette. Each family carries a scale for accents and
  		   tints, plus a DEFAULT so the pre-existing flat utilities
  		   (bg-gold, text-walnut, from-terracotta) keep resolving unchanged. */
  		cream: {
  			DEFAULT: '#F7F2E8',
  			50: '#FDFBF6',
  			100: '#F7F2E8',
  			200: '#EFE7D7',
  			300: '#E3D7C1',
  			400: '#D2C2A5'
  		},
  		sand: {
  			DEFAULT: '#E9DECB',
  			100: '#F1E9DB',
  			200: '#E9DECB',
  			300: '#DAC9AE',
  			400: '#C7B18E'
  		},
  		gold: {
  			DEFAULT: '#C99A5C',
  			100: '#F6EAD5',
  			200: '#EBD5AC',
  			300: '#DCBB80',
  			400: '#C99A5C',
  			500: '#B4823F',
  			600: '#94692F'
  		},
  		/* Terracotta / clay — the primary action and warm mid-tone. */
  		terracotta: {
  			DEFAULT: '#A37B5C',
  			100: '#F2E6DC',
  			200: '#E2CDB8',
  			300: '#CBAE8E',
  			400: '#A37B5C',
  			500: '#8C6547',
  			600: '#714E35'
  		},
  		wood: {
  			DEFAULT: '#6B4A30',
  			400: '#8A6444',
  			500: '#6B4A30',
  			600: '#573A24',
  			700: '#432C1B'
  		},
  		walnut: {
  			DEFAULT: '#4F3624',
  			500: '#4F3624',
  			600: '#412C1D',
  			700: '#332217',
  			800: '#261913',
  			900: '#1B110C'
  		},
  		/* Natural greenery — used sparingly for growth/health signals. */
  		sage: {
  			DEFAULT: '#5D7553',
  			50: '#F1F4EC',
  			100: '#E1E9D8',
  			200: '#C4D3B4',
  			300: '#9DB18B',
  			400: '#7C9468',
  			500: '#5D7553',
  			600: '#4A5F43',
  			700: '#3A4A35'
  		},
  		berbere: {
  			DEFAULT: '#8C2F26',
  			100: '#F6E0DD',
  			200: '#E9BFB9',
  			300: '#D4918A',
  			400: '#A8453A',
  			500: '#8C2F26',
  			600: '#73251E'
  		},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		/* Named steps for the handful of sizes Tailwind's default scale
  		   doesn't cover. Keeps the type ramp in one place instead of
  		   scattering arbitrary values through the JSX. */
  		fontSize: {
  			'2xs': ['0.625rem', { lineHeight: '0.875rem' }],
  			'eyebrow': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.12em' }],
  			'lede': ['0.9375rem', { lineHeight: '1.5rem' }],
  			'page': ['1.75rem', { lineHeight: '2.125rem' }],
  		},
  		letterSpacing: {
  			'eyebrow': '0.12em',
  			'group': '0.14em',
  			'brand': '0.3em',
  		},
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			mono: ['var(--font-mono)']
  		},
  		keyframes: {},
  		animation: {}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
