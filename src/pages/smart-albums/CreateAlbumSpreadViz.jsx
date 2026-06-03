import React, { useMemo } from 'react';
import { buildCreateAlbumSpreadPreview } from './createAlbumSpreadPreview';

function LayoutPageCell({ page }) {
    if (!page || page.kind === 'empty') {
        return <span className="sa-layout-viz-page sa-layout-viz-page--empty" />;
    }

    if (page.kind === 'blank') {
        return <span className="sa-layout-viz-page sa-layout-viz-page--blank" aria-hidden />;
    }

    return (
        <span className="sa-layout-viz-page sa-layout-viz-page--photo">
            {page.url ? (
                <img src={page.url} alt="" draggable={false} loading="lazy" />
            ) : (
                <span className="sa-layout-viz-page-placeholder" aria-hidden />
            )}
            <span className="sa-layout-viz-order" aria-hidden>
                {page.order}
            </span>
        </span>
    );
}

export default function CreateAlbumSpreadViz({
    previewSlots,
    includeCovers,
    gridLayout,
    pageGridSize,
    gridSizeLabel,
}) {
    const model = useMemo(
        () =>
            buildCreateAlbumSpreadPreview({
                previewSlots,
                includeCovers,
                gridLayout,
                pageGridSize,
            }),
        [previewSlots, includeCovers, gridLayout, pageGridSize]
    );

    if (!model?.spreads?.length) return null;

    const referenceUrl = model.referenceSlot?.url ?? null;
    const referenceReady = Boolean(model.referenceSlot?.thumbReady && referenceUrl);
    const pageAspect = model.pageAspect;

    return (
        <div className="sa-layout-viz" aria-label="Album layout preview">
            <div className="sa-layout-viz-ref">
                <p className="sa-layout-viz-heading">Page grid (from first photo)</p>
                <div className="sa-layout-viz-ref-body">
                    <div
                        className={`sa-layout-viz-ref-frame${
                            referenceReady ? ' sa-layout-viz-ref-frame--ready' : ''
                        }`}
                        style={{ aspectRatio: pageAspect }}
                    >
                        {referenceUrl ? (
                            <img src={referenceUrl} alt="" draggable={false} loading="lazy" />
                        ) : (
                            <span className="sa-layout-viz-ref-placeholder" aria-hidden />
                        )}
                    </div>
                    {gridSizeLabel ? (
                        <p className="sa-layout-viz-ref-note">{gridSizeLabel}</p>
                    ) : null}
                </div>
            </div>

            <div className="sa-layout-viz-spreads-wrap">
                <p className="sa-layout-viz-heading">How your photos fill the album</p>
                <div
                    className="sa-layout-viz-spreads"
                    style={{ '--sa-layout-page-aspect': pageAspect }}
                >
                    {model.spreads.map((spread) => (
                        <div
                            key={`spread-${spread.index}`}
                            className={`sa-layout-viz-spread${
                                spread.isCoverSpread ? ' sa-layout-viz-spread--cover' : ''
                            }${spread.isEndSpread ? ' sa-layout-viz-spread--end' : ''}`}
                        >
                            <span className="sa-layout-viz-spread-thumb">
                                {spread.wholeSpread &&
                                spread.left?.kind === 'photo' &&
                                !spread.isCoverSpread &&
                                !spread.isEndSpread ? (
                                    <span
                                        className="sa-layout-viz-page sa-layout-viz-page--spread-full"
                                        style={{
                                            aspectRatio:
                                                pageAspect >= 1
                                                    ? pageAspect * 2
                                                    : pageAspect / 2,
                                        }}
                                    >
                                        {spread.left.url ? (
                                            <img
                                                src={spread.left.url}
                                                alt=""
                                                draggable={false}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <span
                                                className="sa-layout-viz-page-placeholder"
                                                aria-hidden
                                            />
                                        )}
                                        <span className="sa-layout-viz-order" aria-hidden>
                                            {spread.left.order}
                                        </span>
                                    </span>
                                ) : (
                                    <>
                                        <LayoutPageCell page={spread.left} />
                                        {spread.right ? (
                                            <LayoutPageCell page={spread.right} />
                                        ) : null}
                                    </>
                                )}
                            </span>
                            <span className="sa-layout-viz-spread-label">{spread.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
