





import { useContext } from 'react';
// FIX: Add .tsx extension to import.
import { AppContext } from '../context/AppContext.tsx';

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
