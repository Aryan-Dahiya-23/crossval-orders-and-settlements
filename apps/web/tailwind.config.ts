import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import defaultTheme from 'tailwindcss/defaultTheme';

export const texts = {
  'title-h1': [
    '3.5rem',
    {
      lineHeight: '4rem',
      letterSpacing: '-0.01em',
      fontWeight: '500',
    },
  ],
  'title-h2': [
    '3rem',
    {
      lineHeight: '3.5rem',
      letterSpacing: '-0.01em',
      fontWeight: '500',
    },
  ],
  'title-h3': [
    '2.5rem',
    {
      lineHeight: '3rem',
      letterSpacing: '-0.01em',
      fontWeight: '500',
    },
  ],
  'title-h4': [
    '2rem',
    {
      lineHeight: '2.5rem',
      letterSpacing: '-0.005em',
      fontWeight: '500',
    },
  ],
  'title-h5': [
    '1.5rem',
    {
      lineHeight: '2rem',
      letterSpacing: '0em',
      fontWeight: '500',
    },
  ],
  'title-h6': [
    '1.25rem',
    {
      lineHeight: '1.75rem',
      letterSpacing: '0em',
      fontWeight: '500',
    },
  ],
  'label-xl': [
    '1.5rem',
    {
      lineHeight: '2rem',
      letterSpacing: '-0.015em',
      fontWeight: '500',
    },
  ],
  'label-lg': [
    '1.125rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '-0.015em',
      fontWeight: '500',
    },
  ],
  'label-md': [
    '1rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '-0.011em',
      fontWeight: '500',
    },
  ],
  'label-sm': [
    '.875rem',
    {
      lineHeight: '1.25rem',
      letterSpacing: '-0.006em',
      fontWeight: '500',
    },
  ],
  'label-xs': [
    '.75rem',
    {
      lineHeight: '1rem',
      letterSpacing: '0em',
      fontWeight: '500',
    },
  ],
  'paragraph-xl': [
    '1.5rem',
    {
      lineHeight: '2rem',
      letterSpacing: '-0.015em',
      fontWeight: '400',
    },
  ],
  'paragraph-lg': [
    '1.125rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '-0.015em',
      fontWeight: '400',
    },
  ],
  'paragraph-md': [
    '1rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '-0.011em',
      fontWeight: '400',
    },
  ],
  'paragraph-sm': [
    '.875rem',
    {
      lineHeight: '1.25rem',
      letterSpacing: '-0.006em',
      fontWeight: '400',
    },
  ],
  'paragraph-xs': [
    '.75rem',
    {
      lineHeight: '1rem',
      letterSpacing: '0em',
      fontWeight: '400',
    },
  ],
  'subheading-md': [
    '1rem',
    {
      lineHeight: '1.5rem',
      letterSpacing: '0.06em',
      fontWeight: '500',
    },
  ],
  'subheading-sm': [
    '.875rem',
    {
      lineHeight: '1.25rem',
      letterSpacing: '0.06em',
      fontWeight: '500',
    },
  ],
  'subheading-xs': [
    '.75rem',
    {
      lineHeight: '1rem',
      letterSpacing: '0.04em',
      fontWeight: '500',
    },
  ],
  'subheading-2xs': [
    '.6875rem',
    {
      lineHeight: '.75rem',
      letterSpacing: '0.02em',
      fontWeight: '500',
    },
  ],
  'doc-label': [
    '1.125rem',
    {
      lineHeight: '2rem',
      letterSpacing: '-0.015em',
      fontWeight: '500',
    },
  ],
  'doc-paragraph': [
    '1.125rem',
    {
      lineHeight: '2rem',
      letterSpacing: '-0.015em',
      fontWeight: '400',
    },
  ],
} as unknown as Record<string, string>;

const hsl = (token: string) => `hsl(var(${token}) / <alpha-value>)`;

export const shadows = {
  'regular-xs': '0 1px 2px 0 #0a0d1408',
  'regular-sm': '0 2px 4px #1b1c1d0a',
  'regular-md': '0 16px 32px -12px #0e121b1a',
  'button-primary-focus': [
    '0 0 0 2px hsl(var(--bg-white-0))',
    '0 0 0 4px hsl(var(--neutral-alpha-10))',
  ],
  'button-important-focus': [
    '0 0 0 2px hsl(var(--bg-white-0))',
    '0 0 0 4px hsl(var(--neutral-alpha-16))',
  ],
  'button-error-focus': [
    '0 0 0 2px hsl(var(--bg-white-0))',
    '0 0 0 4px hsl(var(--red-alpha-10))',
  ],
  'fancy-buttons-neutral': ['0 1px 2px 0 #1b1c1d7a', '0 0 0 1px #242628'],
  'fancy-buttons-primary': [
    '0 1px 2px 0 #0e121b3d',
    '0 0 0 1px hsl(var(--primary-base))',
  ],
  'fancy-buttons-error': [
    '0 1px 2px 0 #0e121b3d',
    '0 0 0 1px hsl(var(--error-base))',
  ],
  'fancy-buttons-stroke': [
    '0 1px 3px 0 #0e121b1f',
    '0 0 0 1px hsl(var(--stroke-soft-200))',
  ],
  'toggle-switch': ['0 6px 10px 0 #0e121b0f', '0 2px 4px 0 #0e121b08'],
  'switch-thumb': ['0 4px 8px 0 #1b1c1d0f', '0 2px 4px 0 #0e121b14'],
  tooltip: ['0 12px 24px 0 #0e121b0f', '0 1px 2px 0 #0e121b08'],
} as unknown as Record<string, string>;

export const borderRadii = {
  '10': '.625rem',
  '12': '.75rem',
  '16': '1rem',
  '20': '1.25rem',
} as unknown as Record<string, string>;

const config = {
  darkMode: ['class', '.dark'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors: {
      neutral: {
        '0': hsl('--neutral-0'),
        '50': hsl('--neutral-50'),
        '100': hsl('--neutral-100'),
        '200': hsl('--neutral-200'),
        '300': hsl('--neutral-300'),
        '400': hsl('--neutral-400'),
        '500': hsl('--neutral-500'),
        '600': hsl('--neutral-600'),
        '700': hsl('--neutral-700'),
        '800': hsl('--neutral-800'),
        '900': hsl('--neutral-900'),
        '950': hsl('--neutral-950'),
        'alpha-24': 'hsl(var(--neutral-alpha-24))',
        'alpha-16': 'hsl(var(--neutral-alpha-16))',
        'alpha-10': 'hsl(var(--neutral-alpha-10))',
      },
      blue: {
        '50': hsl('--blue-50'),
        '100': hsl('--blue-100'),
        '200': hsl('--blue-200'),
        '300': hsl('--blue-300'),
        '400': hsl('--blue-400'),
        '500': hsl('--blue-500'),
        '600': hsl('--blue-600'),
        '700': hsl('--blue-700'),
        '800': hsl('--blue-800'),
        '900': hsl('--blue-900'),
        '950': hsl('--blue-950'),
        'alpha-24': 'hsl(var(--blue-alpha-24))',
        'alpha-16': 'hsl(var(--blue-alpha-16))',
        'alpha-10': 'hsl(var(--blue-alpha-10))',
      },
      orange: {
        '50': hsl('--orange-50'),
        '100': hsl('--orange-100'),
        '200': hsl('--orange-200'),
        '300': hsl('--orange-300'),
        '400': hsl('--orange-400'),
        '500': hsl('--orange-500'),
        '600': hsl('--orange-600'),
        '700': hsl('--orange-700'),
        '800': hsl('--orange-800'),
        '900': hsl('--orange-900'),
        '950': hsl('--orange-950'),
        'alpha-24': 'hsl(var(--orange-alpha-24))',
        'alpha-16': 'hsl(var(--orange-alpha-16))',
        'alpha-10': 'hsl(var(--orange-alpha-10))',
      },
      red: {
        '50': hsl('--red-50'),
        '100': hsl('--red-100'),
        '200': hsl('--red-200'),
        '300': hsl('--red-300'),
        '400': hsl('--red-400'),
        '500': hsl('--red-500'),
        '600': hsl('--red-600'),
        '700': hsl('--red-700'),
        '800': hsl('--red-800'),
        '900': hsl('--red-900'),
        '950': hsl('--red-950'),
        'alpha-24': 'hsl(var(--red-alpha-24))',
        'alpha-16': 'hsl(var(--red-alpha-16))',
        'alpha-10': 'hsl(var(--red-alpha-10))',
      },
      green: {
        '50': hsl('--green-50'),
        '100': hsl('--green-100'),
        '200': hsl('--green-200'),
        '300': hsl('--green-300'),
        '400': hsl('--green-400'),
        '500': hsl('--green-500'),
        '600': hsl('--green-600'),
        '700': hsl('--green-700'),
        '800': hsl('--green-800'),
        '900': hsl('--green-900'),
        '950': hsl('--green-950'),
        'alpha-24': 'hsl(var(--green-alpha-24))',
        'alpha-16': 'hsl(var(--green-alpha-16))',
        'alpha-10': 'hsl(var(--green-alpha-10))',
      },
      yellow: {
        '50': hsl('--yellow-50'),
        '100': hsl('--yellow-100'),
        '200': hsl('--yellow-200'),
        '300': hsl('--yellow-300'),
        '400': hsl('--yellow-400'),
        '500': hsl('--yellow-500'),
        '600': hsl('--yellow-600'),
        '700': hsl('--yellow-700'),
        '800': hsl('--yellow-800'),
        '900': hsl('--yellow-900'),
        '950': hsl('--yellow-950'),
        'alpha-24': 'hsl(var(--yellow-alpha-24))',
        'alpha-16': 'hsl(var(--yellow-alpha-16))',
        'alpha-10': 'hsl(var(--yellow-alpha-10))',
      },
      white: {
        DEFAULT: '#fff',
        'alpha-24': 'hsl(var(--white-alpha-24))',
        'alpha-16': 'hsl(var(--white-alpha-16))',
        'alpha-10': 'hsl(var(--white-alpha-10))',
      },
      black: {
        DEFAULT: '#000',
        'alpha-24': 'hsl(var(--black-alpha-24))',
        'alpha-16': 'hsl(var(--black-alpha-16))',
        'alpha-10': 'hsl(var(--black-alpha-10))',
      },
      primary: {
        dark: hsl('--primary-dark'),
        darker: hsl('--primary-darker'),
        base: hsl('--primary-base'),
        lighter: hsl('--primary-lighter'),
        alpha: hsl('--primary-alpha'),
        'alpha-24': 'hsl(var(--primary-alpha-24))',
        'alpha-16': 'hsl(var(--primary-alpha-16))',
        'alpha-10': 'hsl(var(--primary-alpha-10))',
      },
      static: {
        black: hsl('--static-black'),
        white: hsl('--static-white'),
      },
      bg: {
        strong: hsl('--bg-strong-950'),
        'strong-950': hsl('--bg-strong-950'),
        surface: hsl('--bg-surface-800'),
        'surface-800': hsl('--bg-surface-800'),
        sub: hsl('--bg-sub-300'),
        'sub-300': hsl('--bg-sub-300'),
        soft: hsl('--bg-soft-200'),
        'soft-200': hsl('--bg-soft-200'),
        weak: hsl('--bg-weak-50'),
        'weak-50': hsl('--bg-weak-50'),
        white: hsl('--bg-white-0'),
        'white-0': hsl('--bg-white-0'),
      },
      text: {
        strong: hsl('--text-strong-950'),
        'strong-950': hsl('--text-strong-950'),
        sub: hsl('--text-sub-600'),
        'sub-600': hsl('--text-sub-600'),
        soft: hsl('--text-soft-400'),
        'soft-400': hsl('--text-soft-400'),
        disabled: hsl('--text-disabled-300'),
        'disabled-300': hsl('--text-disabled-300'),
        white: hsl('--text-white-0'),
        'white-0': hsl('--text-white-0'),
      },
      stroke: {
        strong: hsl('--stroke-strong-950'),
        'strong-950': hsl('--stroke-strong-950'),
        sub: hsl('--stroke-sub-300'),
        'sub-300': hsl('--stroke-sub-300'),
        soft: hsl('--stroke-soft-200'),
        'soft-200': hsl('--stroke-soft-200'),
        white: hsl('--stroke-white-0'),
        'white-0': hsl('--stroke-white-0'),
      },
      faded: {
        dark: hsl('--faded-dark'),
        base: hsl('--faded-base'),
        light: hsl('--faded-light'),
        lighter: hsl('--faded-lighter'),
      },
      information: {
        dark: hsl('--information-dark'),
        base: hsl('--information-base'),
        light: hsl('--information-light'),
        lighter: hsl('--information-lighter'),
      },
      warning: {
        dark: hsl('--warning-dark'),
        base: hsl('--warning-base'),
        light: hsl('--warning-light'),
        lighter: hsl('--warning-lighter'),
      },
      error: {
        dark: hsl('--error-dark'),
        base: hsl('--error-base'),
        light: hsl('--error-light'),
        lighter: hsl('--error-lighter'),
      },
      success: {
        dark: hsl('--success-dark'),
        base: hsl('--success-base'),
        light: hsl('--success-light'),
        lighter: hsl('--success-lighter'),
      },
      overlay: {
        DEFAULT: 'hsl(var(--overlay))',
      },
      transparent: 'transparent',
      current: 'currentColor',
    },
    fontSize: {
      ...texts,
      inherit: 'inherit',
    },
    boxShadow: {
      ...shadows,
      none: defaultTheme.boxShadow.none,
    },
    extend: {
      borderRadius: {
        ...borderRadii,
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
            opacity: '1',
          },
          to: { height: '0', opacity: '0' },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

export default config;
