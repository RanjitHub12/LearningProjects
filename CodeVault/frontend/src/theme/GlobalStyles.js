import { createGlobalStyle } from 'styled-components';

/* The theme object is used by styled-components for JS access.
   CSS custom properties handle light/dark switching (index.css). */
export const theme = {
  fonts: { sans: "var(--cv-font-sans)", mono: "var(--cv-font-mono)" },
  radii: { sm: '6px', md: '10px', lg: '14px', xl: '20px', full: '999px' },
  space: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px', '2xl': '48px' },
  transitions: { fast: '0.15s ease', base: '0.25s ease', slow: '0.4s ease' },
  breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
};

export const GlobalStyles = createGlobalStyle`
  button, a, input, select, textarea {
    transition: all 0.2s ease;
  }
`;
