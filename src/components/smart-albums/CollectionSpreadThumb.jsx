import React, { memo } from 'react';

function HalfSpreadPage({ showPhoto, src, alt }) {
    return (
        <span className="ae-collection-thumb-page">
            {showPhoto ? (
                <img
                    className="ae-collection-thumb-photo--half"
                    src={src}
                    alt={alt}
                    draggable={false}
                />
            ) : null}
        </span>
    );
}

function CollectionSpreadThumb({ layout, alt = '' }) {
    const { mode, src, side } = layout || {};
    if (!src) {
        return <span className="ae-collection-thumb-spread ae-collection-thumb-spread--empty" />;
    }

    if (mode === 'spread-whole') {
        return (
            <span className="ae-collection-thumb-spread ae-collection-thumb-spread--whole">
                <span className="ae-collection-thumb-page ae-collection-thumb-page--full">
                    <img
                        className="ae-collection-thumb-photo--whole"
                        src={src}
                        alt={alt}
                        draggable={false}
                    />
                </span>
            </span>
        );
    }

    if (mode === 'spread-half') {
        return (
            <span className="ae-collection-thumb-spread">
                <HalfSpreadPage showPhoto={side === 'left'} src={src} alt={alt} />
                <HalfSpreadPage showPhoto={side === 'right'} src={src} alt={alt} />
            </span>
        );
    }

    return (
        <span className="ae-collection-thumb-spread ae-collection-thumb-spread--photo-only">
            <img src={src} alt={alt} draggable={false} />
        </span>
    );
}

export default memo(CollectionSpreadThumb, (prev, next) => {
    const a = prev.layout || {};
    const b = next.layout || {};
    return (
        prev.alt === next.alt &&
        a.mode === b.mode &&
        a.src === b.src &&
        a.side === b.side
    );
});
