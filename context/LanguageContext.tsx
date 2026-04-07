

import React, { createContext } from 'react';

export const LanguageContext = createContext({});

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    return (
        <LanguageContext.Provider value={{}}>
            {children}
        </LanguageContext.Provider>
    );
};
