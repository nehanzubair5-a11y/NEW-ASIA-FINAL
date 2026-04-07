




import { useContext } from 'react';
// FIX: Add .tsx extension to import path.
import { AuthContext } from '../context/AuthContext.tsx';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
