import React from 'react';
import { resolveBookWrapSpreadSrc } from '../albumPagePhotos';
import { resolveFrontCoverDisplayText } from '../albumCoverText';

/**
 * Catches WebGL / Three.js failures and shows a tappable 2D cover fallback.
 */
export default class Book3DErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.warn('Book3DErrorBoundary:', error?.message || error, info?.componentStack);
    }

    render() {
        if (this.state.error) {
            const { album, showSamples = false, onCoverOpen } = this.props;
            const coverSrc = album ? resolveBookWrapSpreadSrc(album, { showSamples }) : null;
            const title = resolveFrontCoverDisplayText(album, album?.id);

            return (
                <div
                    className="ab-book-cover-3d-shell ab-book-cover-3d-shell--fallback"
                    onClick={onCoverOpen}
                    onKeyDown={(e) => {
                        if (onCoverOpen && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            onCoverOpen();
                        }
                    }}
                    role={onCoverOpen ? 'button' : undefined}
                    tabIndex={onCoverOpen ? 0 : undefined}
                >
                    <div className="ab-book-cover-3d ab-root ab-root--preview">
                        <div className="ab-book-stage">
                            <div className="ab-book-cover-3d-stage ab-book-scene--openable">
                                {coverSrc ? (
                                    <img
                                        src={coverSrc}
                                        alt=""
                                        className="ab-book-cover-3d-fallback-img"
                                    />
                                ) : (
                                    <div className="ab-book-cover-3d-fallback-title">
                                        {title || 'Click to open album'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
