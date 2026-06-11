import type { Config } from 'tailwindcss'

const PHI = 1.618

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Quantum dark palette
        void: {
          950: '#020408',
          900: '#040810',
          800: '#080f1c',
          700: '#0d1826',
        },
        quantum: {
          50:  '#e8f4ff',
          100: '#c3e0ff',
          200: '#85c2ff',
          300: '#47a3ff',
          400: '#1a85ff',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
        },
        plasma: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        wave: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        photon: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        particle: {
          400: '#f472b6',
          500: '#ec4899',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        phi: `${PHI}rem`,
        'phi-sm': `${PHI * 0.618}rem`,
        'phi-lg': `${PHI * PHI}rem`,
      },
      borderRadius: {
        phi: `${(PHI - 1) * 100}%`,
      },
      backgroundImage: {
        'quantum-grid': `
          linear-gradient(rgba(0, 102, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 102, 255, 0.05) 1px, transparent 1px)
        `,
        'fibonacci-gradient': 'radial-gradient(ellipse at 38.2% 61.8%, #0d1826 0%, #020408 100%)',
        'wave-gradient': 'linear-gradient(135deg, #020408 0%, #080f1c 61.8%, #0d1826 100%)',
      },
      backgroundSize: {
        'grid-phi': '61.8px 61.8px',
      },
      animation: {
        'wave-propagate': 'wavePropagation 3s ease-in-out infinite',
        'particle-drift': 'particleDrift 6s ease-in-out infinite',
        'quantum-pulse': 'quantumPulse 2s ease-in-out infinite',
        'fibonacci-spin': 'fibonacciSpin 20s linear infinite',
        'scan-line': 'scanLine 4s linear infinite',
      },
      keyframes: {
        wavePropagation: {
          '0%, 100%': { transform: 'translateX(0) scaleY(1)', opacity: '0.6' },
          '50%': { transform: 'translateX(10px) scaleY(1.2)', opacity: '1' },
        },
        particleDrift: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(4px, -6px)' },
          '66%': { transform: 'translate(-4px, 3px)' },
        },
        quantumPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(0, 102, 255, 0.4)' },
          '50%': { boxShadow: '0 0 24px rgba(0, 102, 255, 0.8), 0 0 48px rgba(139, 92, 246, 0.3)' },
        },
        fibonacciSpin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      boxShadow: {
        'quantum-glow': '0 0 20px rgba(0, 102, 255, 0.4), 0 0 40px rgba(0, 102, 255, 0.1)',
        'plasma-glow': '0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.1)',
        'wave-glow': '0 0 20px rgba(16, 185, 129, 0.4)',
        'inner-quantum': 'inset 0 1px 0 rgba(0, 102, 255, 0.2)',
      },
      gridTemplateColumns: {
        'phi-3': '38.2% 61.8%',
        'phi-3-inv': '61.8% 38.2%',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

export default config
