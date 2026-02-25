
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'md' }) => {
  const containerSizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-xl',
    xl: 'w-16 h-16 rounded-2xl',
    '2xl': 'w-20 h-20 rounded-2xl',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`shrink-0 ${containerSizes[size]} bg-[#31458E] flex items-center justify-center shadow-xl shadow-blue-500/20 border border-white/10 ring-1 ring-white/5 ${className}`}>
            <img
        src="https://res.cloudinary.com/dxryndnhl/image/upload/v1772008038/MooreHotels/website-assets/y3jgkzcainnzo3apmvkp.png"
        alt="Moore Hotels & Suites"
      />
    </div>
  );
};

export default Logo;
