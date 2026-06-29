import React from 'react';
import { CheckCircle2 } from 'lucide-react';
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
                className={`sa-proofer-toggle ${checked ? 'sa-proofer-toggle--on' : 'sa-proofer-toggle--off'}`}
                aria-pressed={checked}
                aria-label={label}
            >
                <span className="sa-proofer-toggle__knob" />
            </button>
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
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
            <div className="sa-proofer-select-wrap">
                <select
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                    className="sa-proofer-select"
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
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

function VariableBadge({ variable, onClick }) {
    return (
        <button type="button" onClick={onClick} className="sa-proofer-var">
            {variable}
        </button>
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
        <div>
            <FieldLabel>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
            {variables.length > 0 && (
                <div className="sa-proofer-vars">
                    {variables.map((variable) => (
                        <VariableBadge
                            key={variable}
                            variable={variable}
                            onClick={() => insertVariable(variable)}
                        />
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
                    className={`sa-proofer-collapse__chevron ${isOpen ? 'sa-proofer-collapse__chevron--open' : 'sa-proofer-collapse__chevron--closed'}`}
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

export function SettingGroup({ title, children }) {
    return (
        <section className="sa-proofer-group">
            <SectionTitle>{title}</SectionTitle>
            <div className="sa-proofer-card">{children}</div>
        </section>
    );
}

export function SettingsSaveBar({ saving, saved }) {
    return (
        <div className="sa-proofer-save">
            <p className="sa-proofer-save__hint">
                {saving ? 'Saving…' : 'Changes are saved automatically'}
            </p>
            {!saving && saved && (
                <div className="sa-proofer-save__status">
                    <CheckCircle2 size={16} strokeWidth={2} />
                    All settings saved
                </div>
            )}
        </div>
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
                    className={`sa-proofer-tabs__btn${activeTab === tab.id ? ' sa-proofer-tabs__btn--active' : ''}`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
