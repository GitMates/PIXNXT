import React from 'react';
import { getSpreadPages } from './albumSpreadUtils';
import { AlbumSpreadPage } from './AlbumSpreadPage';
import './AlbumPageFlipAnimation.css';

/**
 * 3D page-turn layers: peek pages, under-spread, static page, and rotating leaf.
 */
export function AlbumPageFlipAnimation({
    flip,
    album,
    totalPages,
    activeSpread,
    totalSpreads,
}) {
    const underPages = flip ? getSpreadPages(flip.toSpread) : null;
    const fromPages = flip?.fromPages ?? null;

    return (
        <>
            {activeSpread > 0 && (
                <div className="ab-peek-page ab-peek-page--left">
                    <AlbumSpreadPage
                        album={album}
                        pageNum={(activeSpread - 1) * 2}
                        totalPages={totalPages}
                        isLeft
                    />
                </div>
            )}

            {activeSpread < totalSpreads - 1 && (
                <div className="ab-peek-page ab-peek-page--right">
                    <AlbumSpreadPage
                        album={album}
                        pageNum={(activeSpread + 1) * 2 + 1}
                        totalPages={totalPages}
                        isLeft={false}
                    />
                </div>
            )}

            {flip?.direction === 'next' && fromPages && underPages && (
                <>
                    <div className="ab-spread ab-spread--under">
                        <AlbumSpreadPage
                            album={album}
                            pageNum={underPages.left}
                            totalPages={totalPages}
                            isLeft
                        />
                        <div className="ab-under-right-wrapper">
                            <AlbumSpreadPage
                                album={album}
                                pageNum={underPages.right}
                                totalPages={totalPages}
                                isLeft={false}
                            />
                            <div className="ab-static-shadow ab-static-shadow--under-right" />
                        </div>
                    </div>

                    <div className="ab-sheet-static ab-sheet-static--left">
                        <AlbumSpreadPage
                            album={album}
                            pageNum={fromPages.left}
                            totalPages={totalPages}
                            isLeft
                        />
                        <div className="ab-static-shadow ab-static-shadow--static-left" />
                    </div>

                    <div className="ab-rigid-leaf ab-rigid-leaf--next ab-rigid-leaf--anim">
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
                                pageNum={underPages.left}
                                totalPages={totalPages}
                                isLeft
                            />
                            <div className="ab-leaf-overlay ab-leaf-overlay--back" />
                        </div>
                    </div>
                </>
            )}

            {flip?.direction === 'prev' && fromPages && underPages && (
                <>
                    <div className="ab-spread ab-spread--under">
                        <div className="ab-under-left-wrapper">
                            <AlbumSpreadPage
                                album={album}
                                pageNum={underPages.left}
                                totalPages={totalPages}
                                isLeft
                            />
                            <div className="ab-static-shadow ab-static-shadow--under-left" />
                        </div>
                        <AlbumSpreadPage
                            album={album}
                            pageNum={underPages.right}
                            totalPages={totalPages}
                            isLeft={false}
                        />
                    </div>

                    <div className="ab-sheet-static ab-sheet-static--right">
                        <AlbumSpreadPage
                            album={album}
                            pageNum={fromPages.right}
                            totalPages={totalPages}
                            isLeft={false}
                        />
                        <div className="ab-static-shadow ab-static-shadow--static-right" />
                    </div>

                    <div className="ab-rigid-leaf ab-rigid-leaf--prev ab-rigid-leaf--anim">
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
                                pageNum={underPages.right}
                                totalPages={totalPages}
                                isLeft={false}
                            />
                            <div className="ab-leaf-overlay ab-leaf-overlay--back" />
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
