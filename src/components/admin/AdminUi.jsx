import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppSpinner } from '../ui/AppLoading';

/** Shared admin page header */
export function AdminPageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-gray-500 mt-1 text-sm leading-relaxed max-w-2xl">{subtitle}</p>
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
          ) : <span />}
          {hint ? <p className="text-[11px] text-gray-400">{hint}</p> : null}
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
    ? 'text-red-700'
    : tone === 'warn'
      ? 'text-amber-700'
      : tone === 'ok'
        ? 'text-emerald-700'
        : 'text-gray-900';

  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</h3>
        {Icon ? (
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-[#f0eee9] text-gray-600">
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <p className={`text-2xl sm:text-3xl font-bold mt-3 tabular-nums ${toneCls}`}>
        {loading ? <AppSpinner size="sm" /> : value}
      </p>
      {sub ? <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{sub}</p> : null}
      {meter != null && !loading ? (
        <div className="mt-3 h-1.5 rounded-full bg-[#efece6] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              tone === 'danger' ? 'bg-red-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-[#1a1a1a]'
            }`}
            style={{ width: `${Math.max(2, Math.min(100, Number(meter) || 0))}%` }}
          />
        </div>
      ) : null}
    </>
  );

  const cls =
    'bg-white p-5 rounded-2xl border border-[#eae8e4] shadow-sm flex flex-col justify-between min-h-[120px]';

  return to ? (
    <Link to={to} className={`${cls} hover:border-gray-400/80 transition-colors`}>
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
    return <p className="text-sm text-gray-500 py-6 text-center">{empty}</p>;
  }
  return (
    <div className="space-y-2.5">
      {top.map((item) => {
        const count = Number(item.count) || 0;
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900 truncate">{item.label}</span>
              <span className="text-xs font-mono text-gray-500 shrink-0 tabular-nums">{count.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-[#efece6] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#1a1a1a] transition-all"
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
              onClick={() => onSelect(item)}
              className="w-full text-left group hover:opacity-90"
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
          <span className="text-[11px] font-medium text-gray-500">{label}</span>
          <span className={`text-[11px] font-semibold tabular-nums ${exhausted ? 'text-red-700' : warn ? 'text-amber-700' : 'text-gray-700'}`}>
            {disabled ? 'Off' : unlimited ? `${u.toLocaleString()} / ∞` : `${Math.round(pct)}%`}
          </span>
        </div>
      ) : null}
      <div className="h-2 rounded-full bg-[#efece6] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            disabled ? 'bg-gray-300'
              : exhausted ? 'bg-red-500'
                : warn ? 'bg-amber-500'
                  : unlimited ? 'bg-emerald-500/80'
                    : 'bg-[#1a1a1a]'
          }`}
          style={{ width: disabled ? '100%' : unlimited ? '12%' : `${Math.max(pct > 0 ? 4 : 0, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function AdminPanel({ title, children, className = '', action }) {
  return (
    <div className={`rounded-2xl border border-[#eae8e4] bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#eae8e4]">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
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

  const maxW = size === 'lg' ? 'sm:max-w-2xl' : size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-xl';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1a1a]/45 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${maxW} max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#fdfdfc] border border-[#eae8e4] shadow-2xl overflow-hidden`}
      >
        <div className="shrink-0 flex items-start gap-3 px-5 py-4 border-b border-[#eae8e4] bg-white/90">
          {avatar ? (
            <div className="size-11 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-base font-semibold shrink-0">
              {avatar}
            </div>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="admin-modal-title" className="text-lg font-semibold text-gray-900 leading-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 size-9 inline-flex items-center justify-center rounded-xl border border-[#eae8e4] bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-[#eae8e4] bg-white/90">
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
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
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
        className="px-4 py-2.5 text-sm font-medium rounded-xl border border-[#eae8e4] bg-white text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#1a1a1a] text-white hover:bg-black disabled:opacity-50"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </>
  );
}
