import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { AppProvider } from './context/AppContext.tsx';
import { DataProvider } from './context/DataContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <DataProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </DataProvider>
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);
