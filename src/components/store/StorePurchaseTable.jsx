import React, { useMemo, useState } from 'react';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function shortId(id) {
  if (!id) return '—';
  return `#${String(id).split('-')[0].toUpperCase()}`;
}

/**
 * Orders-style purchase table for Vault / Digital Download purchases.
 * rows: { id, status, customer_name, customer_email, collection_name, created_at, amount, plan_label, detail? }
 */
export default function StorePurchaseTable({
  title = 'Purchases',
  subtitle = '',
  rows = [],
  loading = false,
  emptyText = 'No purchases yet.',
  planColumnLabel = 'Plan',
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        shortId(row.id),
        row.id,
        row.customer_name,
        row.customer_email,
        row.collection_name,
        row.status,
        row.plan_label,
        formatDate(row.created_at),
        String(row.amount ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  return (
    <div style={{ marginTop: '28px', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <div className="store-dashboard-header-row" style={{ marginBottom: '16px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="store-dashboard-title" style={{ fontSize: '18px', margin: 0 }}>{title}</h2>
          {subtitle ? (
            <p className="store-dashboard-subtitle" style={{ margin: '6px 0 0' }}>{subtitle}</p>
          ) : null}
        </div>
        <div className="results-count-label" style={{ flexShrink: 0 }}>
          {filtered.length > 0
            ? `Displaying 1-${filtered.length} of ${filtered.length} results.`
            : 'No results.'}
        </div>
      </div>

      <div style={{ marginBottom: '16px', maxWidth: '480px', position: 'relative' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, id, collection…"
          className="neu-inset"
          style={{
            height: '40px',
            width: '100%',
            borderRadius: '9999px',
            border: 'none',
            paddingLeft: '16px',
            paddingRight: '16px',
            fontSize: '14px',
            color: '#1a1a1a',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div className="store-dashboard-table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="store-dashboard-table" style={{ minWidth: '1100px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Contact</th>
              <th>Collection</th>
              <th>Date</th>
              <th>Time</th>
              <th>{planColumnLabel}</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="no-records-row">
                  {loading ? 'Loading…' : emptyText}
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const isExpanded = expandedId === row.id;
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={`order-main-row ${isExpanded ? 'row-expanded' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    >
                      <td className="font-semibold text-dark">{shortId(row.id)}</td>
                      <td>
                        <span className={`order-status-badge status-${row.status || 'completed'}`}>
                          {(row.status || 'completed').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{row.customer_name || '—'}</td>
                      <td>
                        <span style={{ fontSize: '13px', color: '#333' }}>{row.customer_email || '—'}</span>
                      </td>
                      <td>{row.collection_name || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(row.created_at)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#666' }}>{formatTime(row.created_at)}</td>
                      <td>{row.plan_label || '—'}</td>
                      <td className="font-semibold" style={{ textAlign: 'right' }}>
                        ₹{Number(row.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="order-view-toggle-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(isExpanded ? null : row.id);
                          }}
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="order-details-drawer-row">
                        <td colSpan={10} className="order-details-drawer-cell">
                          <div className="order-details-wrapper animate-slide-down">
                            <div className="shipping-details-box">
                              <h3 className="details-box-title">Purchase Details</h3>
                              <div className="shipping-details-card">
                                <div className="shipping-detail-col">
                                  <span className="label-heading">Full ID</span>
                                  <span className="value-text tracking-code">{row.id}</span>
                                </div>
                                <div className="shipping-detail-col">
                                  <span className="label-heading">{planColumnLabel}</span>
                                  <span className="value-text">{row.plan_label || '—'}</span>
                                </div>
                                <div className="shipping-detail-col">
                                  <span className="label-heading">Payment</span>
                                  <span className="value-text">{row.payment_method || row.payment_intent_id || '—'}</span>
                                </div>
                                <div className="shipping-detail-col">
                                  <span className="label-heading">Customer</span>
                                  <span className="value-text">
                                    {row.customer_name || '—'}
                                    <br />
                                    {row.customer_email || '—'}
                                  </span>
                                </div>
                                <div className="shipping-detail-col">
                                  <span className="label-heading">Collection</span>
                                  <span className="value-text">{row.collection_name || '—'}</span>
                                </div>
                                {row.detail ? (
                                  <div className="shipping-detail-col">
                                    <span className="label-heading">Notes</span>
                                    <span className="value-text">{row.detail}</span>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Product types managed outside Print Lab shop / Products tab. */
export const DIGITAL_CATALOG_PRODUCT_TYPES = ['digital_download', 'digital_download_all'];
