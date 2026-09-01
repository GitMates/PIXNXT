import React from 'react';
import { AppSpinner } from '../../ui/AppLoading';

/**
 * Full-screen loading state for CollectionDashboard — mirrors shell layout with shimmer.
 */
export function DeliveryDashboardLoader() {
    return (
        <div
            className="theme-mono cd-dashboard-shell cd-delivery-loader"
            role="status"
            aria-live="polite"
            aria-label="Loading delivery"
        >
            <div className="cd-shell-header cd-delivery-loader__header">
                <div className="cd-shell-brand cd-delivery-loader__brand">
                    <span className="cd-delivery-loader__bone cd-delivery-loader__bone--icon" />
                    <div className="cd-delivery-loader__brand-copy">
                        <span className="cd-delivery-loader__bone cd-delivery-loader__bone--title" />
                        <span className="cd-delivery-loader__bone cd-delivery-loader__bone--date" />
                    </div>
                </div>
                <div className="cd-delivery-loader__topbar">
                    <span className="cd-delivery-loader__bone cd-delivery-loader__bone--pill" />
                    <span className="cd-delivery-loader__bone cd-delivery-loader__bone--pill cd-delivery-loader__bone--pill-sm" />
                    <span className="cd-delivery-loader__bone cd-delivery-loader__bone--pill cd-delivery-loader__bone--pill-sm" />
                </div>
            </div>

            <div className="cd-layout-body cd-delivery-loader__body">
                <aside className="cd-delivery-loader__sidebar" aria-hidden>
                    <span className="cd-delivery-loader__bone cd-delivery-loader__bone--cover" />
                    <div className="cd-delivery-loader__nav">
                        {['72%', '58%', '64%', '52%'].map((width) => (
                            <span
                                key={width}
                                className="cd-delivery-loader__bone cd-delivery-loader__bone--nav"
                                style={{ width }}
                            />
                        ))}
                    </div>
                </aside>

                <div className="cd-delivery-loader__main">
                    <div className="cd-delivery-loader__main-head">
                        <span className="cd-delivery-loader__bone cd-delivery-loader__bone--heading" />
                        <span className="cd-delivery-loader__bone cd-delivery-loader__bone--sub" />
                    </div>

                    <div className="cd-delivery-loader__center">
                        <AppSpinner size="lg" />
                        <p className="cd-delivery-loader__label">
                            Opening delivery
                            <span className="cd-delivery-loader__ellipsis" aria-hidden>
                                <span>.</span>
                                <span>.</span>
                                <span>.</span>
                            </span>
                        </p>
                    </div>

                    <div className="cd-delivery-loader__grid" aria-hidden>
                        {Array.from({ length: 8 }, (_, index) => (
                            <span
                                key={index}
                                className="cd-delivery-loader__bone cd-delivery-loader__bone--tile"
                                style={{ animationDelay: `${index * 0.08}s` }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
