import React from 'react';
import { cn } from '../../../lib/utils';

export function ClientGalleryPageShell({
    title,
    subtitle,
    actions,
    toolbar,
    children,
    contentClassName,
    bodyClassName,
}) {
    return (
        <main className={cn('cg-style-2', bodyClassName)}>
            <div className="mx-auto w-full max-w-7xl px-4 pt-10 sm:px-8 sm:pt-12">
                {(title || actions) && (
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            {title ? (
                                <h1 className="cg-page-title text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>
                            ) : null}
                            {subtitle ? (
                                <p className="mt-2 text-sm text-[#71717A]">{subtitle}</p>
                            ) : null}
                        </div>
                        {actions ? <div className="shrink-0">{actions}</div> : null}
                    </div>
                )}
                {toolbar ? <div className="mt-8">{toolbar}</div> : null}
            </div>
            <div className={cn('mx-auto w-full max-w-7xl px-4 pb-12 sm:px-8', contentClassName)}>
                {children}
            </div>
        </main>
    );
}

export function ClientGallerySearchField({ value, onChange, placeholder, ariaLabel, className }) {
    return (
        <div className={cn('relative flex-1', className)}>
            <svg
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71717A]"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
            >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
                type="search"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                aria-label={ariaLabel || placeholder}
                className="neu-inset h-10 w-full rounded-full border-0 pl-9 pr-3 text-sm text-[#1A1A1A] outline-none placeholder:text-[#71717A]"
            />
        </div>
    );
}

export function ClientGallerySubpageTabs({ tabs, activeId, onChange }) {
    return (
        <div className="neu-inset inline-flex flex-wrap items-center gap-1 rounded-full p-1">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        'rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                        activeId === tab.id
                            ? 'neu-circle text-[#1A1A1A]'
                            : 'text-[#71717A] hover:text-[#1A1A1A]',
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
