import React, { useEffect } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppSpinner } from '../ui/AppLoading';

/** Shared admin page header */
export function AdminPageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="type-page-title">{title}</h1>
        {subtitle ? (
          <p className="ad-muted-text mt-1 text-sm leading-relaxed max-w-2xl">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
    </div>
  );
}

export function AdminSection({ title, hint, children, className = '' }) {
  return (
    <section className={className}>
      {(title || hint) && (
        <div className="flex items-baseline justify-between gap-3 mb-3">
          {title ? (
            <h2 className="text-xs font-semibold uppercase tracking-wider ad-muted-text">{title}</h2>
          ) : <span />}
          {hint ? <p className="text-[11px] ad-faint-text">{hint}</p> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function AdminStatCard({
  label,
  value,
  sub,
  loading,
  to,
  tone,
  meter,
  icon: Icon,
}) {
  const toneCls = tone === 'danger'
    ? 'text-[var(--ad-bad)]'
    : tone === 'warn'
      ? 'text-[var(--ad-warn)]'
      : tone === 'ok'
        ? 'text-[var(--ad-ok)]'
        : 'ad-ink';

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide ad-muted-text">{label}</h3>
        <span className="flex items-center gap-1.5">
          {to ? (
            <ArrowUpRight className="ad-stat-arrow size-4 ad-faint-text" />
          ) : null}
          {Icon ? (
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[var(--ad-sunk)] text-[var(--ad-muted)]">
              <Icon className="size-4" />
            </span>
          ) : null}
        </span>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold mt-3 tabular-nums ${toneCls}`}>
        {loading ? <AppSpinner size="sm" /> : value}
      </p>
      {sub ? <p className="text-[11px] ad-faint-text mt-1.5 leading-snug">{sub}</p> : null}
      {meter != null && !loading ? (
        <div className="mt-3 h-1.5 rounded-full bg-[var(--ad-meter-track)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              tone === 'danger' ? 'bg-[var(--ad-bad)]' : tone === 'warn' ? 'bg-[var(--ad-warn)]' : 'bg-[var(--ad-meter-fill)]'
            }`}
            style={{ width: `${Math.max(2, Math.min(100, Number(meter) || 0))}%` }}
          />
        </div>
      ) : null}
    </>
  );

  const cls =
    'ad-stat ad-card p-5 flex flex-col justify-between min-h-[120px]';

  return to ? (
    <Link to={to} className={`${cls} transition-colors`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** Horizontal bar chart list for admin overview panels */
export function AdminBarList({ items = [], max = 8, onSelect, empty = 'No data yet.' }) {
  const top = items.slice(0, max);
  const peak = Math.max(1, ...top.map((i) => Number(i.count) || 0));
  if (!top.length) {
    return <p className="text-sm ad-muted-text py-6 text-center">{empty}</p>;
  }
  return (
    <div className="space-y-2.5">
      {top.map((item) => {
        const count = Number(item.count) || 0;
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-sm font-medium ad-ink truncate">{item.label}</span>
              <span className="text-xs font-mono ad-muted-text shrink-0 tabular-nums">{count.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--ad-meter-track)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--ad-meter-fill)] transition-all"
                style={{ width: `${Math.max(4, (count / peak) * 100)}%` }}
              />
            </div>
          </>
        );
        if (onSelect) {
          return (
            <button
              key={item.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(item)}
              className="w-full text-left group hover:opacity-90 select-none"
            >
              {body}
            </button>
          );
        }
        return <div key={item.key}>{body}</div>;
      })}
    </div>
  );
}

/** Usage meter for storage / quotas in tables and modals */
export function AdminUsageMeter({ used = 0, limit = 0, label, className = '' }) {
  const cap = Number(limit);
  const u = Number(used) || 0;
  const unlimited = !(cap > 0);
  const disabled = cap === -1;
  const pct = cap > 0 ? Math.min(100, (u / cap) * 100) : 0;
  const exhausted = cap > 0 && u >= cap;
  const warn = cap > 0 && pct >= 80 && !exhausted;

  return (
    <div className={className}>
      {label ? (
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-medium ad-muted-text">{label}</span>
          <span className={`text-[11px] font-semibold tabular-nums ${exhausted ? 'text-[var(--ad-bad)]' : warn ? 'text-[var(--ad-warn)]' : 'ad-ink'}`}>
            {disabled ? 'Off' : unlimited ? `${u.toLocaleString()} / ∞` : `${Math.round(pct)}%`}
          </span>
        </div>
      ) : null}
      <div className="h-2 rounded-full bg-[var(--ad-meter-track)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            disabled ? 'bg-[var(--ad-muted)] opacity-40'
              : exhausted ? 'bg-[var(--ad-bad)]'
                : warn ? 'bg-[var(--ad-warn)]'
                  : unlimited ? 'bg-[var(--ad-ok)] opacity-80'
                    : 'bg-[var(--ad-meter-fill)]'
          }`}
          style={{ width: disabled ? '100%' : unlimited ? '12%' : `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function AdminPanel({ title, children, className = '', action }) {
  return (
    <div className={`ad-panel ad-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--ad-line)] select-none">
          <h3 className="text-sm font-semibold ad-ink">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

/**
 * Polished admin modal shell — Esc / backdrop close, scroll lock, sticky header/footer.
 */
export function AdminModal({
  open,
  onClose,
  title,
  subtitle,
  avatar,
  children,
  footer,
  size = 'md', // sm | md | lg
}) {
  useEffect(() => {
    if (!open) return undefined;
    // Clear any leftover text selection from the trigger click (blue highlight on titles).
    try { window.getSelection()?.removeAllRanges(); } catch { /* ignore */ }
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === 'xl' ? 'sm:max-w-4xl' : size === 'lg' ? 'sm:max-w-2xl' : size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-xl';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <button
        type="button"
        className="ad-modal-backdrop absolute inset-0 bg-[color-mix(in_srgb,var(--ad-ink)_45%,transparent)] backdrop-blur-[2px] select-none"
        aria-label="Close dialog"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
      />
      <div
        className={`ad-modal-card relative w-full ${maxW} max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[var(--ad-card)] border border-[var(--ad-line)] shadow-2xl overflow-hidden`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start gap-3 px-5 py-4 border-b border-[var(--ad-line)] bg-[var(--ad-card)] select-none">
          {avatar ? (
            <div className="size-11 rounded-full bg-[var(--ad-ink)] text-[var(--ad-card)] flex items-center justify-center text-base font-semibold shrink-0">
              {avatar}
            </div>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="admin-modal-title" className="text-lg font-semibold ad-ink leading-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-sm ad-muted-text mt-0.5 truncate">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ad-btn-secondary shrink-0 size-9 inline-flex items-center justify-center rounded-xl p-0"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-[var(--ad-line)] bg-[var(--ad-card)] select-none">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminModalSection({ title, children }) {
  return (
    <div className="space-y-3">
      {title ? (
        <h3 className="text-[11px] font-semibold uppercase tracking-wider ad-faint-text">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}

export function AdminModalActions({ onCancel, onSave, saving, saveLabel = 'Save changes' }) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        className="ad-btn-secondary px-4 py-2.5 text-sm"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="ad-btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </>
  );
}
