import React from 'react';

interface SkeletonLoaderProps {
    type: 'table' | 'cards' | 'form';
    rows?: number;
    cols?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ type, rows = 5, cols = 4 }) => {
    const renderTableSkeleton = () => (
        <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-3">
                    {[...Array(rows)].map((_, i) => (
                        <div key={i} className="grid grid-cols-5 gap-4">
                            <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                            <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                            <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                            <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                            <div className="h-4 bg-slate-200 rounded col-span-1"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderCardSkeleton = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(cols)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/2 mb-3"></div>
                    <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                </div>
            ))}
        </div>
    );
    
    if (type === 'table') {
        return renderTableSkeleton();
    }

    if (type === 'cards') {
        return renderCardSkeleton();
    }

    return null;
};

export default SkeletonLoader;
