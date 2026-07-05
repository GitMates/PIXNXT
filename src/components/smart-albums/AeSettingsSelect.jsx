import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export default function AeSettingsSelect({ id, value, onChange, options, disabled = false }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const selected = options.find((option) => option.value === value) || options[0];

    useEffect(() => {
        if (!open) return undefined;

        const handlePointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const handleSelect = (nextValue) => {
        if (disabled || nextValue === value) {
            setOpen(false);
            return;
        }
        onChange(nextValue);
        setOpen(false);
    };

    return (
        <div
            ref={rootRef}
            className={`ae-settings-select-menu${open ? ' ae-settings-select-menu--open' : ''}`}
        >
            <button
                type="button"
                id={id}
                className="ae-settings-select-trigger"
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => setOpen((current) => !current)}
            >
                <span className="ae-settings-select-trigger__label">{selected?.label}</span>
                <ChevronDown
                    size={16}
                    strokeWidth={2}
                    className="ae-settings-select-trigger__chevron"
                    aria-hidden
                />
            </button>

            {open && (
                <ul className="ae-settings-select-options" role="listbox" aria-labelledby={id}>
                    {options.map((option) => {
                        const isActive = option.value === value;
                        return (
                            <li key={option.value} role="presentation">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isActive}
                                    className={`ae-settings-select-option${
                                        isActive ? ' ae-settings-select-option--active' : ''
                                    }`}
                                    onClick={() => handleSelect(option.value)}
                                >
                                    <span className="ae-settings-select-option__text">
                                        <span className="ae-settings-select-option__label">
                                            {option.label}
                                        </span>
                                        {option.description ? (
                                            <span className="ae-settings-select-option__desc">
                                                {option.description}
                                            </span>
                                        ) : null}
                                    </span>
                                    {isActive ? (
                                        <Check
                                            size={15}
                                            strokeWidth={2.5}
                                            className="ae-settings-select-option__check"
                                            aria-hidden
                                        />
                                    ) : null}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
