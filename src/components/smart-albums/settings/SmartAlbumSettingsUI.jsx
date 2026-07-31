import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './SmartAlbumProoferSettings.css';

export function SectionTitle({ children }) {
    return <h3 className="sa-proofer-group__label">{children}</h3>;
}

export function FieldLabel({ children }) {
    return <span className="sa-proofer-field__label">{children}</span>;
}

export function FieldDescription({ children }) {
    return <p className="sa-proofer-field__desc">{children}</p>;
}

export function Divider() {
    return <div className="sa-proofer-divider" />;
}

export function SettingsToggle({
    checked,
    onChange,
    label,
    description,
    disabled = false,
    variant = 'accent',
}) {
    return (
        <div className="sa-proofer-toggle-row">
            <div className="sa-proofer-toggle-row__text">
                <FieldLabel>{label}</FieldLabel>
                {description && <FieldDescription>{description}</FieldDescription>}
            </div>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`sa-proofer-toggle sa-proofer-toggle--${variant} ${
                    checked ? 'sa-proofer-toggle--on' : 'sa-proofer-toggle--off'
                }`}
                aria-pressed={checked}
                aria-label={label}
            >
                <span className="sa-proofer-toggle__knob" />
            </button>
        </div>
    );
}

export function RadioCard({
    name,
    value,
    checked,
    onChange,
    label,
    description,
    disabled = false,
}) {
    return (
        <label
            className={`sa-proofer-radio-card${checked ? ' sa-proofer-radio-card--selected' : ''}${
                disabled ? ' sa-proofer-radio-card--disabled' : ''
            }`}
        >
            <input
                type="radio"
                className="sa-proofer-radio-card__input"
                name={name}
                value={value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(value)}
            />
            <span className="sa-proofer-radio-card__dot" aria-hidden />
            <span className="sa-proofer-radio-card__body">
                <span className="sa-proofer-radio-card__label">{label}</span>
                {description ? (
                    <span className="sa-proofer-radio-card__desc">{description}</span>
                ) : null}
            </span>
        </label>
    );
}

export function RadioCardGroup({ name, value, onChange, options, disabled = false }) {
    return (
        <div className="sa-proofer-radio-group" role="radiogroup">
            {options.map((option) => (
                <RadioCard
                    key={option.value}
                    name={name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={onChange}
                    label={option.label}
                    description={option.description}
                    disabled={disabled}
                />
            ))}
        </div>
    );
}

export function SelectField({
    label,
    description,
    value,
    onChange,
    options,
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const listId = useId();
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
        <div>
            <FieldLabel>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
            <div
                ref={rootRef}
                className={`sa-proofer-select-menu${open ? ' sa-proofer-select-menu--open' : ''}`}
            >
                <button
                    type="button"
                    className="sa-proofer-select-trigger"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-controls={listId}
                    disabled={disabled}
                    onClick={() => setOpen((current) => !current)}
                >
                    <span className="sa-proofer-select-trigger__label">
                        {selected?.label}
                        {selected?.description && (
                            <span className="sa-proofer-select-trigger__desc-text">
                                {' '}
                                — {selected.description}
                            </span>
                        )}
                    </span>
                    <ChevronDown
                        size={16}
                        strokeWidth={2}
                        className="sa-proofer-select-trigger__chevron"
                        aria-hidden
                    />
                </button>

                {open && (
                    <ul
                        id={listId}
                        className="sa-proofer-select-options"
                        role="listbox"
                        aria-label={label}
                    >
                        {options.map((option) => {
                            const isActive = option.value === value;
                            return (
                                <li key={option.value} role="presentation">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={isActive}
                                        className={`sa-proofer-select-option${
                                            isActive ? ' sa-proofer-select-option--active' : ''
                                        }`}
                                        onClick={() => handleSelect(option.value)}
                                    >
                                        <span className="sa-proofer-select-option__text">
                                            <span className="sa-proofer-select-option__label">
                                                {option.label}
                                            </span>
                                            {option.description ? (
                                                <span className="sa-proofer-select-option__desc">
                                                    {option.description}
                                                </span>
                                            ) : null}
                                        </span>
                                        {isActive ? (
                                            <Check
                                                size={15}
                                                strokeWidth={2.5}
                                                className="sa-proofer-select-option__check"
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
        </div>
    );
}

export function NumberInput({
    label,
    description,
    value,
    onChange,
    min = 1,
    max = 100,
    disabled = false,
}) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
            <input
                type="number"
                min={min}
                max={max}
                disabled={disabled}
                value={value}
                onChange={(e) =>
                    onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))
                }
                className="sa-proofer-input"
            />
        </div>
    );
}

export function DaysInput({
    label,
    description,
    value,
    onChange,
    min = 1,
    max = 60,
    disabled = false,
}) {
    return (
        <div className="sa-proofer-days-row">
            <div className="sa-proofer-toggle-row__text">
                <FieldLabel>{label}</FieldLabel>
                {description && <FieldDescription>{description}</FieldDescription>}
            </div>
            <div className="sa-proofer-days-input">
                <input
                    type="number"
                    min={min}
                    max={max}
                    disabled={disabled}
                    value={value}
                    onChange={(e) =>
                        onChange(
                            Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min))
                        )
                    }
                    className="sa-proofer-input sa-proofer-input--days"
                    aria-label={label}
                />
                <span className="sa-proofer-days-input__unit">days</span>
            </div>
        </div>
    );
}

export function TemplateTextarea({
    label,
    description,
    value,
    onChange,
    variables = [],
    placeholder,
    disabled = false,
}) {
    const insertVariable = (variable) => {
        onChange(`${value}${value && !value.endsWith('\n') ? ' ' : ''}${variable}`);
    };

    return (
        <div className="sa-proofer-template">
            {label ? <FieldLabel>{label}</FieldLabel> : null}
            {description && <FieldDescription>{description}</FieldDescription>}
            {variables.length > 0 && (
                <div className="sa-proofer-vars">
                    {variables.map((variable) => (
                        <button
                            key={variable}
                            type="button"
                            className="sa-proofer-var"
                            disabled={disabled}
                            onClick={() => insertVariable(variable)}
                        >
                            {variable}
                        </button>
                    ))}
                </div>
            )}
            <textarea
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="sa-proofer-textarea"
            />
        </div>
    );
}

export function CollapsibleStatusSection({ title, isOpen, onToggle, children }) {
    return (
        <div className="sa-proofer-collapse">
            <button type="button" onClick={onToggle} className="sa-proofer-collapse__head">
                <span>{title}</span>
                <svg
                    className={`sa-proofer-collapse__chevron ${
                        isOpen
                            ? 'sa-proofer-collapse__chevron--open'
                            : 'sa-proofer-collapse__chevron--closed'
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                >
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>
            {isOpen && <div className="sa-proofer-collapse__body">{children}</div>}
        </div>
    );
}

export function SettingGroup({ title, children, bare = false }) {
    return (
        <section className="sa-proofer-group">
            {title ? <SectionTitle>{title}</SectionTitle> : null}
            {bare ? children : <div className="sa-proofer-card">{children}</div>}
        </section>
    );
}

export function SettingsTabs({ tabs, activeTab, onChange }) {
    return (
        <div className="sa-proofer-tabs" role="tablist">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => onChange(tab.id)}
                    className={`sa-proofer-tabs__btn${
                        activeTab === tab.id ? ' sa-proofer-tabs__btn--active' : ''
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export function SavedStatus({ saving = false }) {
    return (
        <div
            className={`sa-proofer-saved${saving ? ' sa-proofer-saved--saving' : ''}`}
            role="status"
            aria-live="polite"
        >
            {saving ? (
                <span className="sa-proofer-saved__dot sa-proofer-saved__dot--saving" aria-hidden />
            ) : null}
            <span className="sa-proofer-saved__text">
                {saving ? 'Saving…' : 'All settings saved'}
            </span>
            <span className="sa-proofer-saved__sep" aria-hidden>
                ·
            </span>
            <span className="sa-proofer-saved__hint">changes apply to new albums only</span>
        </div>
    );
}
