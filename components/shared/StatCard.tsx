import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactElement<any>;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onClick }) => {
  const content = (
    <>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
        <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
      </div>
       <div className={`relative flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-xl text-white shadow-lg ${color} `}>
        <div className={`absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl`}></div>
        {React.cloneElement(icon, { className: "w-8 h-8" })}
      </div>
    </>
  );
  
  const baseClasses = "group bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm flex items-center justify-between transition-all duration-300";

  if (onClick) {
    return (
      <button onClick={onClick} className={`${baseClasses} w-full text-left hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}>
        {content}
      </button>
    );
  }

  return (
    <div className={`${baseClasses} hover:shadow-xl hover:-translate-y-1`}>
        {content}
    </div>
  );
};

export default StatCard;
