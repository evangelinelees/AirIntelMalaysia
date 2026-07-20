/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens — "instrument panel" moved from dark to a clean
        // daylight console. Token NAMES are unchanged from the previous
        // theme (panel/panelRaised/ink/clear/warn/alert/haze) so every
        // existing className still resolves — only the hex values moved.
        panel: '#F4F7FA',        // Cotton Ball — app background
        panelRaised: '#FFFFFF',  // cards / raised surfaces
        panelSunken: '#E5EFFF',  // Cotton Boll — insets, chat bubbles, hover fills
        ink: '#1F2942',          // Black Market — primary text
        brand: '#209CEE',        // Out of the Blue — primary actions, links, focus rings
        haze: {
          // Neutral scale for secondary text/borders, derived between
          // panelSunken and ink so it stays legible on a light ground.
          50: '#EAF0F9',
          200: '#8C99AE',
          400: '#5B6478',
          600: '#3A4356',
        },
        clear: '#00B8A8',   // Turquoise — clearing / good status ONLY
        warn: '#FFB01F',    // Master Nacho — moderate / caution status
        // Not part of the supplied palette — added so "unsafe/incoming
        // plume" has a real danger color. Picked to sit at the same
        // saturation/lightness as the rest of the set.
        alert: '#E5484D',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        instrument: '3px', // sharp, dial-like — not the default rounded-xl softness
      },
      boxShadow: {
        instrument: '0 1px 2px rgba(31, 41, 66, 0.06), 0 1px 1px rgba(31, 41, 66, 0.04)',
        instrumentRaised: '0 4px 16px rgba(31, 41, 66, 0.08), 0 1px 2px rgba(31, 41, 66, 0.06)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
