
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const containerSizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-xl',
    xl: 'w-16 h-16 rounded-2xl',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`shrink-0 ${containerSizes[size]} bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-blue-500/20 border border-white/10 ring-1 ring-white/5 ${className}`}>
      <span className={`text-white ${textSizes[size]} font-black italic tracking-tighter leading-none select-none drop-shadow-md`}>M</span>
    </div>
  );
};

export default Logo;
