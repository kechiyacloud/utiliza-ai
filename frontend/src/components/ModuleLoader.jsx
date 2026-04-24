import React from 'react';

const ModuleLoader = ({ label = 'Loading data...' }) => {
  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center p-8 text-slate-500 animate-in fade-in duration-500">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Spinner */}
        <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-blue-500/10"></div>
            <div className="absolute top-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-blue-600"></div>
        </div>
        
        {/* Loading Text */}
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-bold tracking-[0.2em] text-slate-700 uppercase">{label}</p>
          <div className="flex items-center gap-1">
            <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]"></span>
            <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]"></span>
            <span className="h-1 w-1 animate-bounce rounded-full bg-blue-400"></span>
          </div>
          <p className="text-[10px] font-semibold text-slate-400 mt-1">Synchronizing with server</p>
        </div>
      </div>
    </div>
  );
};

export default ModuleLoader;
