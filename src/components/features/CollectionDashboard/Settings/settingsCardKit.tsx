import React from 'react';

export function Chevron({ open }: { open: boolean }) {
    return (
        <svg className="cd-basics-card__chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            {open
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />}
        </svg>
    );
}

export function Toggle({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label?: string;
}) {
    return (
        <label className="cd-toggle">
            <input
                type="checkbox"
                checked={checked}
                aria-label={label}
                onChange={(e) => onChange(e.target.checked)}
            />
            <span className="cd-toggle-slider" />
        </label>
    );
}

export function ToggleRow({
    title,
    desc,
    checked,
    onChange,
}: {
    title: string;
    desc: string;
    checked: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <div className="cd-basics-toggle">
            <div className="cd-basics-toggle__copy">
                <p className="cd-basics-toggle__title">{title}</p>
                <p className="cd-basics-toggle__desc">{desc}</p>
            </div>
            <Toggle checked={checked} onChange={onChange} label={title} />
        </div>
    );
}

export function SettingsCard({
    id,
    openId,
    onToggle,
    icon,
    title,
    summary,
    children,
}: {
    id: string;
    openId: string | null;
    onToggle: (id: string) => void;
    icon: React.ReactNode;
    title: string;
    summary: React.ReactNode;
    children?: React.ReactNode;
}) {
    const open = openId === id;
    return (
        <article className={`cd-basics-card${open ? ' is-open' : ''}`}>
            <button
                type="button"
                className="cd-basics-card__head"
                onClick={() => onToggle(id)}
                aria-expanded={open}
            >
                {icon}
                <span className="cd-basics-card__copy">
                    <h3 className="cd-basics-card__title">{title}</h3>
                    <p className="cd-basics-card__summary">{summary}</p>
                </span>
                <Chevron open={open} />
            </button>
            {open ? <div className="cd-basics-card__body">{children}</div> : null}
        </article>
    );
}

export function GridIcon({ variant }: { variant?: 'alt' }) {
    return (
        <span className={`cd-basics-grid-icon${variant ? ` cd-basics-grid-icon--${variant}` : ''}`} aria-hidden>
            <span /><span /><span /><span />
        </span>
    );
}

export function LockIcon({ size = 12 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
    );
}

export function EyeIcon({ off }: { off?: boolean }) {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            {off ? (
                <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <path d="m1 1 22 22" />
                </>
            ) : (
                <>
                    <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
                    <circle cx="12" cy="12" r="3" />
                </>
            )}
        </svg>
    );
}

export function PlayIcon() {
    return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}

/** "12 August" — the way the share message reads a shoot date. */
export function formatShortDate(value?: string | null) {
    if (!value) return '';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    const date = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

export function displayHostPath(url: string) {
    return String(url || '').replace(/^https?:\/\//, '');
}

export function maskEmail(email?: string | null) {
    const raw = String(email || '').trim();
    if (!raw.includes('@')) return raw || 'not addressed';
    const [name, domain] = raw.split('@');
    const tld = domain.includes('.') ? domain.slice(domain.indexOf('.')) : '';
    return `${name}@••••${tld}`;
}

export function relativeTime(value?: string | null) {
    if (!value) return '';
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return '';
    const mins = Math.max(1, Math.round((Date.now() - then) / 60000));
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.round(hours / 24);
    return `${days} d ago`;
}

export function formatMoney(value: number | string | null | undefined, currency = '₹') {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return `${currency}0`;
    return `${currency}${num.toLocaleString('en-IN')}`;
}
