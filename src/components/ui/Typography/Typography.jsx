import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../../lib/utils';

const typographyVariants = cva('', {
  variants: {
    variant: {
      h1: 'scroll-m-20 text-4xl font-light tracking-tight lg:text-5xl font-heading',
      h2: 'scroll-m-20 text-3xl font-light tracking-tight first:mt-0 font-heading',
      h3: 'scroll-m-20 text-2xl font-light tracking-tight font-heading',
      h4: 'scroll-m-20 text-xl font-medium tracking-tight font-sans',
      p: 'leading-7 [&:not(:first-child)]:mt-6 font-sans',
      blockquote: 'mt-6 border-l-2 pl-6 italic',
      list: 'my-6 ml-6 list-disc [&>li]:mt-2',
      lead: 'text-xl text-muted-foreground',
      large: 'text-lg font-semibold',
      small: 'text-sm font-medium leading-none',
      muted: 'text-sm text-muted-foreground',
      label: 'text-[12px] font-bold uppercase tracking-widest text-muted-foreground',
    },
  },
  defaultVariants: {
    variant: 'p',
  },
});

export function Typography({ children, variant, className, as, ...props }) {
  const Comp = as || (variant === 'lead' || variant === 'muted' || variant === 'label' || variant === 'large' ? 'span' : variant === 'list' ? 'ul' : variant || 'p');

  return (
    <Comp 
      className={cn(typographyVariants({ variant, className }))}
      {...props}
    >
      {children}
    </Comp>
  );
}
