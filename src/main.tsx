import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { LanguageProvider, getLang } from './i18n';
import { ThemeProvider, initTheme } from './theme';
import './index.css';

registerSW({ immediate: true });

document.documentElement.lang = getLang();
initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </LanguageProvider>
  </StrictMode>,
);
