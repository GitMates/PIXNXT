import React from 'react';
import { cn } from '../../../lib/utils';

export function Container({ children, className, size = 'default', ...props }) {
  const sizes = {
    default: 'max-w-[1400px]',
    narrow: 'max-w-[800px]',
    wide: 'max-w-[1920px]',
    landing: 'max-w-none px-[clamp(1.5rem,5vw,6rem)]',
  };

  return (
    <div 
      className={cn(
        'mx-auto w-full',
        size === 'landing' ? sizes.landing : cn('px-6 md:px-10', sizes[size]),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
