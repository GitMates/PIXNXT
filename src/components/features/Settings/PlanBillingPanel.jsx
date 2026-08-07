import React from 'react';
import '../../../pages/Settings.css';

const PLAN_FEATURES = [
    '100 GB storage',
    '2 Guest Delivery events each month',
    'Custom domain and no PIXNXT branding',
    'All modules',
];

const INVOICES = [
    { date: '1 Aug 2026', description: 'Solo plan · July', amount: '₹1,948' },
    { date: '1 Jul 2026', description: 'Solo plan · June', amount: '₹1,499' },
    { date: '1 Jun 2026', description: 'Solo plan · May', amount: '₹1,499' },
];

const PAYOUTS = [
    {
        date: '31 Jul 2026',
        description: 'Print Lab · July · 14 orders',
        amount: '₹48,200',
        status: 'Paid',
        tone: 'ok',
    },
    {
        date: 'Pending',
        description: 'August so far · 6 orders',
        amount: '₹19,400',
        status: 'Due 31 Aug',
        tone: 'idle',
    },
];

function CheckIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function GridIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}

export default function PlanBillingPanel() {
    return (
        <div className="pb-panel">
            <div className="pb-info-banner">
                <span className="pb-info-banner__icon">
                    <GridIcon />
                </span>
                <p className="pb-info-banner__text">
                    One plan covers <strong>every module</strong>. Storage, events and payouts are
                    counted across all of them, not per module.
                </p>
            </div>

            {/* ── PLAN ── */}
            <section className="pb-section">
                <span className="pb-overline">PLAN</span>

                <div className="pb-plan-card">
                    <div className="pb-plan-card__main">
                        <h2 className="pb-plan-name">Solo</h2>
                        <p className="pb-plan-price">₹1,499 / month · billed monthly</p>
                        <ul className="pb-plan-features">
                            {PLAN_FEATURES.map((f) => (
                                <li key={f} className="pb-plan-feature">
                                    <span className="pb-plan-check">
                                        <CheckIcon />
                                    </span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="pb-plan-card__actions">
                        <button type="button" className="pb-btn pb-btn--dark">
                            Change plan
                        </button>
                        <button type="button" className="pb-btn pb-btn--outline">
                            Switch to yearly
                        </button>
                    </div>
                </div>

                <p className="pb-footnote">
                    Yearly billing is two months cheaper. Prices exclude GST.
                </p>
            </section>

            {/* ── THIS MONTH ── */}
            <section className="pb-section">
                <span className="pb-overline">THIS MONTH · 1–6 AUGUST</span>

                <div className="pb-usage">
                    <div className="pb-meter">
                        <div className="pb-meter__row">
                            <span className="pb-meter__label">Storage</span>
                            <span className="pb-meter__value">62 / 100 GB</span>
                        </div>
                        <div className="pb-meter__track" aria-hidden>
                            <div className="pb-meter__fill" style={{ width: '62%' }} />
                        </div>
                        <p className="pb-meter__hint">
                            Across all modules. Extra storage is ₹19 per GB per month.
                        </p>
                    </div>

                    <div className="pb-meter">
                        <div className="pb-meter__row">
                            <span className="pb-meter__label">Guest Delivery events</span>
                            <span className="pb-meter__value">
                                2 of 2 included · <span className="pb-meter__extra">1 extra</span>
                            </span>
                        </div>
                        <div className="pb-meter__track" aria-hidden>
                            <div className="pb-meter__fill pb-meter__fill--over" style={{ width: '100%' }}>
                                <span className="pb-meter__over-seg" />
                            </div>
                        </div>
                        <p className="pb-meter__hint">
                            <strong>₹499 charged</strong> for the Sharma wedding on 3 August.
                            Further events this month are ₹499 each.
                        </p>
                    </div>

                    <div className="pb-meter pb-meter--last">
                        <div className="pb-meter__row">
                            <span className="pb-meter__label">WhatsApp messages</span>
                            <span className="pb-meter__value">412 sent</span>
                        </div>
                        <div className="pb-meter__track" aria-hidden>
                            <div className="pb-meter__fill" style={{ width: '8%' }} />
                        </div>
                        <p className="pb-meter__hint">
                            Included in the per-event price. Shown because it is the largest line in
                            what an event costs to run.
                        </p>
                    </div>
                </div>

                <div className="pb-running-total">
                    <p className="pb-running-total__title">
                        Running total this month · ₹1,998
                    </p>
                    <p className="pb-running-total__sub">
                        ₹1,499 plan + ₹499 for one extra Guest Delivery event.
                    </p>
                </div>
            </section>

            {/* ── HOW YOU PAY ── */}
            <section className="pb-section">
                <span className="pb-overline">HOW YOU PAY</span>

                <div className="pb-pay-list">
                    <div className="pb-pay-card">
                        <span className="pb-pay-badge">UPI</span>
                        <div className="pb-pay-card__body">
                            <p className="pb-pay-card__line">
                                <strong>kharthik@okhdfcbank</strong>
                                <span className="pb-pay-card__muted">
                                    {' '}
                                    Autopay mandate active · up to ₹10,000 per month
                                </span>
                            </p>
                        </div>
                        <div className="pb-pay-card__aside">
                            <span className="pb-pay-active">
                                <span className="pb-pay-active__dot" />
                                Active
                            </span>
                            <button type="button" className="pb-btn pb-btn--ghost">
                                Change
                            </button>
                        </div>
                    </div>

                    <div className="pb-pay-card">
                        <span className="pb-pay-badge">VISA</span>
                        <div className="pb-pay-card__body">
                            <p className="pb-pay-card__line">
                                <strong>•••• 4471</strong>
                                <span className="pb-pay-card__muted">
                                    {' '}
                                    Backup · used if the UPI mandate fails
                                </span>
                            </p>
                        </div>
                        <div className="pb-pay-card__aside">
                            <button type="button" className="pb-btn pb-btn--ghost">
                                Remove
                            </button>
                        </div>
                    </div>
                </div>

                <p className="pb-footnote">
                    A UPI autopay mandate has a monthly ceiling. If your usage passes it the
                    payment fails silently — we will warn you at 80%.
                </p>
            </section>

            {/* ── INVOICES ── */}
            <section className="pb-section">
                <span className="pb-overline">INVOICES</span>

                <div className="pb-gstin">
                    <label className="pb-gstin__label" htmlFor="pb-gstin-input">
                        Your GSTIN
                    </label>
                    <input
                        id="pb-gstin-input"
                        className="pb-gstin__input"
                        type="text"
                        readOnly
                        defaultValue="33AABCK1234M1Z5"
                    />
                    <p className="pb-footnote">
                        Needed if you claim input credit. Printed on every invoice issued after you
                        set it.
                    </p>
                </div>

                <div className="pb-table-wrap">
                    <table className="pb-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>DESCRIPTION</th>
                                <th>AMOUNT</th>
                                <th>INVOICE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {INVOICES.map((row) => (
                                <tr key={row.date + row.description}>
                                    <td>{row.date}</td>
                                    <td>{row.description}</td>
                                    <td>{row.amount}</td>
                                    <td>
                                        <button type="button" className="pb-link">
                                            PDF
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── PAYOUTS ── */}
            <section className="pb-section">
                <span className="pb-overline">PAYOUTS</span>
                <p className="pb-section-lead">
                    Money your clients and guests pay you through Print Lab. Money in and money out
                    on one screen — Print Lab links here rather than holding its own copy.
                </p>

                <div className="pb-pay-list">
                    <div className="pb-pay-card">
                        <span className="pb-pay-badge">BANK</span>
                        <div className="pb-pay-card__body">
                            <p className="pb-pay-card__line">
                                <strong>HDFC •••• 8820</strong>
                                <span className="pb-pay-card__muted">
                                    {' '}
                                    Karakovan Photography · verified
                                </span>
                            </p>
                        </div>
                        <div className="pb-pay-card__aside">
                            <button type="button" className="pb-btn pb-btn--ghost">
                                Change
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pb-table-wrap">
                    <table className="pb-table">
                        <thead>
                            <tr>
                                <th>DATE</th>
                                <th>DESCRIPTION</th>
                                <th>AMOUNT</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {PAYOUTS.map((row) => (
                                <tr key={row.date + row.description}>
                                    <td>{row.date}</td>
                                    <td>{row.description}</td>
                                    <td>{row.amount}</td>
                                    <td>
                                        <span
                                            className={
                                                row.tone === 'ok'
                                                    ? 'pb-status pb-status--ok'
                                                    : 'pb-status pb-status--idle'
                                            }
                                        >
                                            <span className="pb-status__dot" />
                                            {row.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── CLOSING YOUR ACCOUNT ── */}
            <section className="pb-section pb-section--last">
                <span className="pb-overline">CLOSING YOUR ACCOUNT</span>

                <div className="pb-danger-box">
                    <p className="pb-danger-box__text">
                        <strong>The one genuinely destructive action in the product.</strong>{' '}
                        Everything else archives. This ends live client links, guest galleries and
                        pending print orders across every module. Requires typing your studio name,
                        and exports every delivery first.
                    </p>
                </div>

                <button type="button" className="pb-close-link">
                    Close account
                </button>
            </section>
        </div>
    );
}
