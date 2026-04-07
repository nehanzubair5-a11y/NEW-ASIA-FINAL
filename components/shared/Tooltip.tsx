import React from 'react';

interface TooltipProps {
  children: React.ReactElement;
  content: string;
  position?: 'top' | 'bottom';
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'top' }) => {
  const positionClass = position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  
  return (
    <span className="relative group flex items-center">
      {children}
      <span className={`absolute left-1/2 -translate-x-1/2 ${positionClass} w-max max-w-xs px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-800 bg-slate-800 dark:bg-slate-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50`}>
        {content}
      </span>
    </span>
  );
};

export default Tooltip;
