import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

export function ClientGallerySelect({
    value,
    onChange,
    options = [],
    className,
    disabled = false,
    'aria-label': ariaLabel,
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);

    const selected = options.find((o) => o.value === value) ?? options[0];

    useEffect(() => {
        if (!open) return undefined;

        const handleClickOutside = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleEscape = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const handleSelect = (nextValue) => {
        onChange?.(nextValue);
        setOpen(false);
    };

    return (
        <div ref={rootRef} className={cn('cg-select relative w-full', className)}>
            <button
                type="button"
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel || selected?.label}
                onClick={() => !disabled && setOpen((v) => !v)}
                className={cn(
                    'cg-select-trigger neu-inset',
                    disabled && 'cursor-not-allowed opacity-60',
                )}
            >
                <span className="cg-select-trigger__label">
                    {selected?.label ?? 'Select…'}
                </span>
                <ChevronDown
                    className={cn(
                        'cg-select-trigger__chevron',
                        open && 'cg-select-trigger__chevron--open',
                    )}
                    aria-hidden
                />
            </button>

            {open && (
                <ul
                    role="listbox"
                    aria-label={ariaLabel || selected?.label}
                    className="cg-select-menu"
                >
                    {options.map((opt) => {
                        const isSelected = opt.value === value;
                        return (
                            <li key={opt.value} role="none">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => handleSelect(opt.value)}
                                    className={cn(
                                        'cg-select-option',
                                        isSelected && 'cg-select-option--selected',
                                    )}
                                >
                                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                                    {isSelected ? (
                                        <Check className="size-3.5 shrink-0 text-[#1A1A1A]" aria-hidden />
                                    ) : (
                                        <span className="size-3.5 shrink-0" aria-hidden />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
