import React from 'react';
import Book3DCoverFallback from './Book3DCoverFallback';

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
        this.props.on3DUnavailable?.(error);
    }

    render() {
        if (this.state.error) {
            const { album, showSamples = false, onCoverOpen } = this.props;
            return (
                <Book3DCoverFallback
                    album={album}
                    showSamples={showSamples}
                    onCoverOpen={onCoverOpen}
                    message="3D preview unavailable — tap to open album"
                />
            );
        }

        return this.props.children;
    }
}
