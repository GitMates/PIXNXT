import React, { useEffect, useMemo, useState } from 'react';
import { userStorageService, getStorageLimitBytes, formatStorageMeter } from '../../../services/userStorage.service';
import { formatStorageBytes } from '../../../utils/formatStorageBytes';
import '../../../pages/Settings.css';

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

function formatCapLabel(bytes) {
    const n = Number(bytes) || 0;
    if (n <= 0) return '10 GB storage';
    const gb = n / (1024 * 1024 * 1024);
    if (gb >= 10) return `${Math.round(gb)} GB storage`;
    return `${formatStorageBytes(n)} storage`;
}

export default function PlanBillingPanel({ profile, user }) {
    const userId = user?.id || profile?.id;
    const [usedBytes, setUsedBytes] = useState(() =>
        userStorageService.getCachedStorageBytes(userId),
    );

    const maxBytes = useMemo(() => getStorageLimitBytes(profile), [profile]);
    const storagePct = useMemo(() => {
        if (!maxBytes) return 0;
        return Math.min(100, (usedBytes / maxBytes) * 100);
    }, [usedBytes, maxBytes]);

    useEffect(() => {
        if (!userId) return undefined;
        let cancelled = false;
        userStorageService
            .calculateUserStorageBytes(user || { id: userId })
            .then((bytes) => {
                if (!cancelled && typeof bytes === 'number' && bytes >= 0) setUsedBytes(bytes);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [user, profile, userId]);

    const features = [
        formatCapLabel(maxBytes),
        'Client Gallery, Album Proofer, and Print Lab',
        'One plan across every released module',
        'No invoice during closed beta',
    ];

    return (
        <div className="pb-panel">
            <div className="pb-info-banner">
                <span className="pb-info-banner__icon">
                    <GridIcon />
                </span>
                <p className="pb-info-banner__text">
                    You are on the <strong>closed beta</strong>. Storage and modules are complimentary
                    for this circle. Paid plans, invoices, and payouts will appear here later.
                </p>
            </div>

            <section className="pb-section">
                <span className="pb-overline">PLAN</span>

                <div className="pb-plan-card">
                    <div className="pb-plan-card__main">
                        <h2 className="pb-plan-name">PIXNXT Beta</h2>
                        <p className="pb-plan-price">Complimentary · no billing this cycle</p>
                        <ul className="pb-plan-features">
                            {features.map((f) => (
                                <li key={f} className="pb-plan-feature">
                                    <span className="pb-plan-check">
                                        <CheckIcon />
                                    </span>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <p className="pb-footnote">
                    This studio is in the photographer beta. Limits can stay higher if we already
                    raised them for you.
                </p>
            </section>

            <section className="pb-section pb-section--last">
                <span className="pb-overline">USAGE</span>

                <div className="pb-usage">
                    <div className="pb-meter pb-meter--last">
                        <div className="pb-meter__row">
                            <span className="pb-meter__label">Storage</span>
                            <span className="pb-meter__value">
                                {formatStorageMeter(usedBytes, maxBytes)}
                            </span>
                        </div>
                        <div className="pb-meter__track" aria-hidden>
                            <div className="pb-meter__fill" style={{ width: `${storagePct}%` }} />
                        </div>
                        <p className="pb-meter__hint">
                            Across Client Gallery, Album Proofer, and Print Lab. Extra storage is
                            not billed during beta.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
