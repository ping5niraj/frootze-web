import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  styles: {
    global: {
      'html, body': {
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        width: '100%',
      },
      body: {
        bg: 'gray.50',
      },
    },
  },
  fonts: {
    heading: `'Plus Jakarta Sans', sans-serif`,
    body: `'Plus Jakarta Sans', sans-serif`,
  },
  breakpoints: {
    base: '0px',
    sm: '480px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
});

export default theme;
