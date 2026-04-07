import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from '../context/AuthContext.tsx';
import { AppProvider } from '../context/AppContext.tsx';
import { DataProvider } from '../context/DataContext.tsx';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <AppProvider>
        <DataProvider>{children}</DataProvider>
      </AppProvider>
    </AuthProvider>
  );
};

const customRender = (ui: React.ReactElement, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// re-export everything from React Testing Library
export * from '@testing-library/react';

// override the default render method with our custom one
export { customRender as render };
