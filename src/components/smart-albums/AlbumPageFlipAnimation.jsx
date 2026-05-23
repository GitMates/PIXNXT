import React from 'react';
import { AlbumSpreadPage } from './AlbumSpreadPage';
import './AlbumPageFlipAnimation.css';

/**
 * 3D page turn: under-layer (one page), static half, and rotating leaf.
 * Under-spread omits the page already shown on the leaf back to avoid spine doubling.
 */
export function AlbumPageFlipAnimation({ flip, album, totalPages, onAnimationEnd }) {
    const { direction, fromPages, toPages } = flip;

    const handleAnimationEnd = (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.animationName !== 'ab-rigid-next' && e.animationName !== 'ab-rigid-prev') return;
        onAnimationEnd?.();
    };

    if (direction === 'next') {
        return (
            <div className="ab-flip-layers">
                <div className="ab-spread ab-spread--under ab-spread--under-next">
                    <div className="ab-under-slot ab-under-slot--left" aria-hidden />
                    <div className="ab-under-slot ab-under-slot--right">
                        <AlbumSpreadPage
                            album={album}
                            pageNum={toPages.right}
                            totalPages={totalPages}
                            isLeft={false}
                        />
                    </div>
                </div>

                <div className="ab-sheet-static ab-sheet-static--left">
                    <AlbumSpreadPage
                        album={album}
                        pageNum={fromPages.left}
                        totalPages={totalPages}
                        isLeft
                    />
                </div>

                <div
                    className="ab-rigid-leaf ab-rigid-leaf--next ab-rigid-leaf--anim"
                    onAnimationEnd={handleAnimationEnd}
                >
                    <div className="ab-rigid-leaf-side ab-rigid-leaf-side--front">
                        <AlbumSpreadPage
                            album={album}
                            pageNum={fromPages.right}
                            totalPages={totalPages}
                            isLeft={false}
                        />
                        <div className="ab-leaf-overlay ab-leaf-overlay--front" />
                    </div>
                    <div className="ab-rigid-leaf-side ab-rigid-leaf-side--back">
                        <AlbumSpreadPage
                            album={album}
                            pageNum={toPages.left}
                            totalPages={totalPages}
                            isLeft
                        />
                        <div className="ab-leaf-overlay ab-leaf-overlay--back" />
                    </div>
                </div>

                <div className="ab-spine-mask" aria-hidden />
            </div>
        );
    }

    return (
        <div className="ab-flip-layers">
            <div className="ab-spread ab-spread--under ab-spread--under-prev">
                <div className="ab-under-slot ab-under-slot--left">
                    <AlbumSpreadPage
                        album={album}
                        pageNum={toPages.left}
                        totalPages={totalPages}
                        isLeft
                    />
                </div>
                <div className="ab-under-slot ab-under-slot--right" aria-hidden />
            </div>

            <div className="ab-sheet-static ab-sheet-static--right">
                <AlbumSpreadPage
                    album={album}
                    pageNum={fromPages.right}
                    totalPages={totalPages}
                    isLeft={false}
                />
            </div>

            <div
                className="ab-rigid-leaf ab-rigid-leaf--prev ab-rigid-leaf--anim"
                onAnimationEnd={handleAnimationEnd}
            >
                <div className="ab-rigid-leaf-side ab-rigid-leaf-side--front">
                    <AlbumSpreadPage
                        album={album}
                        pageNum={fromPages.left}
                        totalPages={totalPages}
                        isLeft
                    />
                    <div className="ab-leaf-overlay ab-leaf-overlay--front" />
                </div>
                <div className="ab-rigid-leaf-side ab-rigid-leaf-side--back">
                    <AlbumSpreadPage
                        album={album}
                        pageNum={toPages.right}
                        totalPages={totalPages}
                        isLeft={false}
                    />
                    <div className="ab-leaf-overlay ab-leaf-overlay--back" />
                </div>
            </div>

            <div className="ab-spine-mask" aria-hidden />
        </div>
    );
}
