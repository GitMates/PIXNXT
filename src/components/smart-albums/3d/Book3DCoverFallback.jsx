import React from 'react';
import { resolveBookWrapSpreadSrc } from '../albumPagePhotos';
import { resolveFrontCoverDisplayText } from '../albumCoverText';
import OverviewLeatherCover from '../OverviewLeatherCover';

/**
 * 2D cover shown when WebGL/3D cannot start — leather (or wrap photo), never a bare title chip.
 */
export default function Book3DCoverFallback({
    album,
    showSamples = false,
    onCoverOpen,
    message = 'Tap to open album',
}) {
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
            aria-label={title ? `Open album ${title}` : 'Open album'}
        >
            <div className="ab-book-cover-3d ab-root ab-root--preview">
                <div className="ab-book-stage">
                    <div className="ab-book-cover-3d-stage ab-book-scene--openable ab-book-cover-3d-fallback-stage">
                        {coverSrc ? (
                            <img
                                src={coverSrc}
                                alt=""
                                className="ab-book-cover-3d-fallback-img"
                                draggable={false}
                            />
                        ) : (
                            <div className="ab-book-cover-3d-fallback-leather">
                                <OverviewLeatherCover album={album} showTitle />
                            </div>
                        )}
                        {onCoverOpen ? (
                            <span className="ab-book-cover-3d-fallback-hint">{message}</span>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
