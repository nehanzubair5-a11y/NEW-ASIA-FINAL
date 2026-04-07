

import React from 'react';
import { useAppContext } from '../../hooks/useAppContext.ts';
import { CloudOffIcon } from '../icons/Icons.tsx';

const OfflineIndicator: React.FC = () => {
    const { isOnline } = useAppContext();

    if (isOnline) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
            <CloudOffIcon />
            <span>You are currently offline.</span>
        </div>
    );
};

export default OfflineIndicator;
