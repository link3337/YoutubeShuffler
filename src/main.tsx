import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App';

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'ytpl-color-scheme'
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider colorSchemeManager={colorSchemeManager} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </React.StrictMode>
);
