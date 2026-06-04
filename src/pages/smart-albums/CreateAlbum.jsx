import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '../../components/ui/DatePicker';
import { addFilesToAlbumCollection } from '../../components/smart-albums/albumCollection';
import { applyCollectionOrderToPages } from '../../components/smart-albums/albumPagePhotos';
import { useAuth } from '../../hooks/useAuth';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    detectGridSizesFromFiles,
    formatGridSizeLabelForLayout,
} from '../../components/smart-albums/albumGridSize';
import {
    computePageCountFromPhotoCount,
    countExpandedUploadPhotos,
    describeAlbumLayout,
} from './createAlbumLayout';
import {
    collectionItemIdsForPreviewSlots,
    createPdfPagePreviewThumbUrl,
    getPdfPageCount,
} from './createAlbumPreviewThumbs';
import { isImageFile, isPdfFile } from '../../lib/pdfToImages';
import {
    filesFromDataTransfer,
    filesFromInput,
    moveFileInOrder,
    moveItemInOrder,
} from '../../lib/uploadFileOrder';
import CreateAlbumSpreadViz from './CreateAlbumSpreadViz.jsx';
import './CreateAlbum.css';

const COVER_OPTIONS = [
    { value: 'with', label: 'Front & end cover' },
    { value: 'without', label: 'No covers' },
];

const GRID_LAYOUT_OPTIONS = [
    { value: 'two-page', label: 'Two-page grid (left + right)' },
    { value: 'whole-spread', label: 'Whole-spread photo' },
    { value: 'custom', label: 'Custom' },
];

function normalizeCustomKey(value, fallback = 'custom') {
    return String(value || fallback)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || fallback;
}

function CustomSelect({ id, value, options, onChange, placeholder = 'Select' }) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const selected = options.find((opt) => String(opt.value) === String(value));

    useEffect(() => {
        const onDocDown = (e) => {
            if (!rootRef.current?.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocDown);
        return () => document.removeEventListener('mousedown', onDocDown);
    }, []);

    return (
        <div className={`sa-select-wrap${open ? ' sa-select-wrap--open' : ''}`} ref={rootRef}>
            <button
                id={id}
                type="button"
                className={`cc-input sa-select-btn${open ? ' sa-select-btn--open' : ''}`}
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span>{selected?.label || placeholder}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
            </button>
            {open && (
                <div className="sa-select-menu" role="listbox" aria-labelledby={id}>
                    {options.map((option) => {
                        const isSelected = String(option.value) === String(value);
                        return (
                            <button
                                key={String(option.value)}
                                type="button"
                                className={`sa-select-option${isSelected ? ' sa-select-option--active' : ''}`}
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                role="option"
                                aria-selected={isSelected}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function formatFileSize(bytes) {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

const UploadPreviewCard = memo(function UploadPreviewCard({
    preview,
    index,
    onRemove,
    animateIn,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragOver,
}) {
    const imgRef = useRef(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        setImageLoaded(false);
        const img = imgRef.current;
        if (img?.complete && img.naturalWidth > 0) {
            setImageLoaded(true);
        }
    }, [preview.id, preview.url]);

    const handleImageLoad = useCallback(() => {
        setImageLoaded(true);
    }, []);

    const showSkeleton = preview.url && !imageLoaded;

    return (
        <figure
            className={`sa-preview-card${showSkeleton ? '' : ' sa-preview-card--ready'}${
                animateIn ? ' sa-preview-card--animate-in' : ''
            }${isDragOver ? ' sa-preview-card--drag-over' : ''}`}
            style={animateIn ? { animationDelay: `${Math.min(index, 8) * 35}ms` } : undefined}
            draggable
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(preview.index));
                onDragStart?.(preview.index);
            }}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                onDragOver?.(preview.index);
            }}
            onDrop={(e) => {
                e.preventDefault();
                onDrop?.(preview.index);
            }}
            onDragEnd={() => onDragEnd?.()}
        >
            <span className="sa-preview-order" aria-hidden>
                {index + 1}
            </span>
            <button
                type="button"
                className="sa-preview-remove"
                onClick={() => onRemove(preview)}
                aria-label={`Remove ${preview.name}`}
            >
                x
            </button>
            <div className="sa-preview-media">
                {preview.url ? (
                    <>
                        {showSkeleton && <div className="sa-preview-skeleton" aria-hidden />}
                        <img
                            ref={imgRef}
                            className={`sa-preview-img${imageLoaded ? ' sa-preview-img--loaded' : ''}`}
                            src={preview.url}
                            alt={preview.name}
                            decoding="async"
                            loading="lazy"
                            draggable={false}
                            onLoad={handleImageLoad}
                        />
                    </>
                ) : !preview.thumbReady ? (
                    <div
                        className={`sa-preview-loading${
                            preview.isPdfPage ? ' sa-preview-loading--pdf' : ''
                        }`}
                        aria-busy="true"
                    >
                        <div
                            className={`sa-preview-skeleton${
                                preview.isPdfPage ? '' : ' sa-preview-skeleton--fill'
                            }`}
                            aria-hidden
                        />
                        <span className="sa-preview-loading-spinner" aria-hidden />
                        <span className="sa-preview-loading-label">
                            {preview.isPdfPage ? 'Loading page…' : 'Loading…'}
                        </span>
                    </div>
                ) : (
                    <div className="sa-preview-loading" aria-busy="true">
                        <div className="sa-preview-skeleton sa-preview-skeleton--fill" aria-hidden />
                        <span className="sa-preview-loading-spinner" aria-hidden />
                    </div>
                )}
            </div>
            <figcaption title={preview.name}>
                <span>{preview.name}</span>
                <small>{formatFileSize(preview.size)}</small>
            </figcaption>
        </figure>
    );
});

const CreateAlbum = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [coverMode, setCoverMode] = useState('with');
    const [gridLayout, setGridLayout] = useState('two-page');
    const [customGridLayout, setCustomGridLayout] = useState('');
    const [detectedGridSize, setDetectedGridSize] = useState('square');
    const [detectedSpreadGridSize, setDetectedSpreadGridSize] = useState(null);

    const [photoFiles, setPhotoFiles] = useState([]);
    const [previewSlots, setPreviewSlots] = useState([]);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [uploadDropActive, setUploadDropActive] = useState(false);
    const dragFromIndexRef = useRef(null);
    const [expandedPhotoCount, setExpandedPhotoCount] = useState(0);
    const [photoCountBusy, setPhotoCountBusy] = useState(false);
    const [gridSizeBusy, setGridSizeBusy] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createProgress, setCreateProgress] = useState(null);
    const [error, setError] = useState(null);

    const includeCovers = coverMode === 'with';

    const resolvedGridLayout = useMemo(() => {
        if (gridLayout === 'custom') {
            return `custom-${normalizeCustomKey(customGridLayout)}`;
        }
        return gridLayout;
    }, [gridLayout, customGridLayout]);

    const gridLayoutForDetection = useMemo(() => {
        if (gridLayout === 'custom') return resolvedGridLayout;
        return gridLayout;
    }, [gridLayout, resolvedGridLayout]);

    const displayPhotoCount =
        previewSlots.length > 0 ? previewSlots.length : expandedPhotoCount;

    const layoutPreview = useMemo(() => {
        if (!displayPhotoCount) return null;
        const pageCount = computePageCountFromPhotoCount(displayPhotoCount, {
            includeCovers,
            gridLayout: resolvedGridLayout,
        });
        return describeAlbumLayout(displayPhotoCount, pageCount, {
            includeCovers,
            gridLayout: resolvedGridLayout,
        });
    }, [displayPhotoCount, includeCovers, resolvedGridLayout]);

    const setProgress = (next) => {
        setCreateProgress(next);
    };

    useEffect(() => {
        if (!photoFiles.length) {
            setPreviewSlots([]);
            return undefined;
        }

        const abort = new AbortController();
        const blobUrls = [];

        const buildSlots = async () => {
            const slots = [];

            for (let fileIndex = 0; fileIndex < photoFiles.length; fileIndex += 1) {
                if (abort.signal.aborted) return;
                const file = photoFiles[fileIndex];
                const fileKey = `${file.name}-${file.lastModified}-${file.size}`;

                if (isImageFile(file)) {
                    const url = URL.createObjectURL(file);
                    blobUrls.push(url);
                    slots.push({
                        id: `${fileKey}-img`,
                        fileIndex,
                        pageIndex: null,
                        name: file.name,
                        size: file.size,
                        url,
                        thumbReady: true,
                        isPdfPage: false,
                    });
                    continue;
                }

                if (isPdfFile(file)) {
                    const pageCount = await getPdfPageCount(file);
                    const baseName = (file.name || 'document.pdf').replace(/\.pdf$/i, '');
                    for (let page = 0; page < pageCount; page += 1) {
                        slots.push({
                            id: `${fileKey}-p${page}`,
                            fileIndex,
                            pageIndex: page,
                            name:
                                pageCount > 1
                                    ? `${baseName} · page ${page + 1}`
                                    : baseName,
                            size: file.size,
                            url: null,
                            thumbReady: false,
                            isPdfPage: true,
                        });
                    }
                }
            }

            if (abort.signal.aborted) return;
            setPreviewSlots(slots);

            for (const slot of slots) {
                if (abort.signal.aborted) return;
                if (slot.pageIndex == null) continue;
                const file = photoFiles[slot.fileIndex];
                let url = null;
                try {
                    url = await createPdfPagePreviewThumbUrl(file, slot.pageIndex + 1);
                } catch {
                    url = null;
                }
                if (abort.signal.aborted) return;
                setPreviewSlots((prev) =>
                    prev.map((item) =>
                        item.id === slot.id
                            ? { ...item, url: url || null, thumbReady: true }
                            : item
                    )
                );
            }
        };

        void buildSlots();

        return () => {
            abort.abort();
            blobUrls.forEach((u) => URL.revokeObjectURL(u));
        };
    }, [photoFiles]);

    useEffect(() => {
        if (!photoFiles.length) {
            setExpandedPhotoCount(0);
            setDetectedGridSize('square');
            setDetectedSpreadGridSize(null);
            setPhotoCountBusy(false);
            setGridSizeBusy(false);
            return undefined;
        }

        let cancelled = false;
        setPhotoCountBusy(true);
        setGridSizeBusy(true);

        const runAnalysis = () => {
            if (cancelled) return;
            Promise.all([
                countExpandedUploadPhotos(photoFiles).catch(() => photoFiles.length),
                detectGridSizesFromFiles(photoFiles, {
                    gridLayout: gridLayoutForDetection,
                }).catch(() => ({ pageGridSize: 'square', spreadGridSize: null })),
            ])
                .then(([count, gridSizes]) => {
                    if (cancelled) return;
                    setExpandedPhotoCount(count);
                    setDetectedGridSize(gridSizes.pageGridSize);
                    setDetectedSpreadGridSize(gridSizes.spreadGridSize);
                })
                .finally(() => {
                    if (!cancelled) {
                        setPhotoCountBusy(false);
                        setGridSizeBusy(false);
                    }
                });
        };

        let idleCallbackId = null;
        let analysisTimeoutId = null;

        if (typeof requestIdleCallback === 'function') {
            idleCallbackId = requestIdleCallback(runAnalysis, { timeout: 1200 });
        } else {
            analysisTimeoutId = window.setTimeout(runAnalysis, 120);
        }

        return () => {
            cancelled = true;
            if (idleCallbackId != null && typeof cancelIdleCallback === 'function') {
                cancelIdleCallback(idleCallbackId);
            }
            if (analysisTimeoutId != null) {
                clearTimeout(analysisTimeoutId);
            }
        };
    }, [photoFiles, gridLayoutForDetection]);

    const analyzingUploads = photoCountBusy || gridSizeBusy;
    const animatePreviewCards = previewSlots.length <= 12;

    const detectedGridLabel = useMemo(() => {
        if (!displayPhotoCount || analyzingUploads) return '';
        return formatGridSizeLabelForLayout(detectedGridSize, gridLayoutForDetection, {
            spreadGridSize: detectedSpreadGridSize,
        });
    }, [
        displayPhotoCount,
        analyzingUploads,
        detectedGridSize,
        gridLayoutForDetection,
        detectedSpreadGridSize,
    ]);

    const applyPhotoFiles = useCallback((files) => {
        if (files?.length) setPhotoFiles(files);
    }, []);

    const handlePhotoChange = (e) => {
        applyPhotoFiles(filesFromInput(e.target.files));
        e.target.value = '';
    };

    const handleUploadDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setUploadDropActive(false);
            applyPhotoFiles(filesFromDataTransfer(e.dataTransfer));
        },
        [applyPhotoFiles]
    );

    const handlePreviewDragStart = useCallback((fromIndex) => {
        dragFromIndexRef.current = fromIndex;
    }, []);

    const handlePreviewDragOver = useCallback((overIndex) => {
        setDragOverIndex(overIndex);
    }, []);

    const handlePreviewDrop = useCallback((toIndex) => {
        const fromIndex = dragFromIndexRef.current;
        dragFromIndexRef.current = null;
        setDragOverIndex(null);
        if (fromIndex == null || fromIndex === toIndex) return;
        setPreviewSlots((prev) => moveItemInOrder(prev, fromIndex, toIndex));
    }, []);

    const handlePreviewDragEnd = useCallback(() => {
        dragFromIndexRef.current = null;
        setDragOverIndex(null);
    }, []);

    const handleRemovePreview = useCallback((slot) => {
        if (!slot) return;
        setPhotoFiles((prev) => prev.filter((_, index) => index !== slot.fileIndex));
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to create an album.');
            setProgress(null);
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setProgress({
            label: 'Starting album creation…',
            detail: null,
            current: 0,
            total: 0,
        });

        try {
            const finalGridLayout =
                gridLayout === 'custom'
                    ? `custom-${normalizeCustomKey(customGridLayout)}`
                    : gridLayout;

            let photoCount = displayPhotoCount || expandedPhotoCount;
            let finalGridSize = detectedGridSize;
            let finalSpreadGridSize = detectedSpreadGridSize;
            if (photoFiles.length > 0) {
                const expanded = await countExpandedUploadPhotos(photoFiles).catch(
                    () => photoFiles.length
                );
                photoCount = Math.max(
                    previewSlots.length,
                    expanded,
                    photoFiles.length
                );
                const gridSizes = await detectGridSizesFromFiles(photoFiles, {
                    gridLayout: finalGridLayout,
                });
                finalGridSize = gridSizes.pageGridSize;
                finalSpreadGridSize = gridSizes.spreadGridSize;
            }

            const finalPageCount = computePageCountFromPhotoCount(photoCount, {
                includeCovers,
                gridLayout: finalGridLayout,
            });

            setProgress({
                label: 'Creating album record…',
                detail: 'Saving layout settings.',
                current: 0,
                total: 0,
            });

            const album = await smartAlbumsService.createAlbum({
                photographer_id: user.id,
                name,
                event_date: date || null,
                page_count: finalPageCount,
                grid_size: finalGridSize,
                spread_grid_size: finalSpreadGridSize,
                grid_layout: finalGridLayout,
                has_covers: includeCovers,
            });

            if (photoFiles.length > 0) {
                const added = await addFilesToAlbumCollection(album.id, photoFiles, {
                    photographerId: user.id,
                    skipDuplicateCheck: true,
                    onProgress: ({ phase, message, current, total }) => {
                        if (phase === 'preparing') {
                            setProgress({
                                label: message || 'Preparing photos…',
                                detail: 'Reading images and PDF pages.',
                                current: current ?? 0,
                                total: total ?? photoFiles.length,
                            });
                            return;
                        }
                        if (phase === 'optimizing') {
                            setProgress({
                                label: message || 'Optimizing photos…',
                                detail: 'Compressing large images for faster upload.',
                                current: current ?? 0,
                                total: total ?? 0,
                            });
                            return;
                        }
                        if (phase === 'uploading') {
                            setProgress({
                                label: message || 'Uploading photos…',
                                detail: 'Saving files to your album collection.',
                                current: current ?? 0,
                                total: total ?? 0,
                            });
                        }
                    },
                });

                setProgress({
                    label: 'Placing photos on spreads…',
                    detail: includeCovers
                        ? 'Setting cover and auto-filling grid slots.'
                        : 'Auto-filling pages from your uploads.',
                    current: 0,
                    total: 0,
                });

                const uploadedCount = added.filter((item) => item?.id).length;
                const orderedItemIds = collectionItemIdsForPreviewSlots(
                    photoFiles,
                    added,
                    previewSlots
                );
                const effectivePhotoCount = Math.max(
                    photoCount,
                    orderedItemIds.length,
                    uploadedCount,
                    displayPhotoCount
                );
                const requiredPageCount = computePageCountFromPhotoCount(effectivePhotoCount, {
                    includeCovers,
                    gridLayout: finalGridLayout,
                });

                let albumForPlace = album;
                if (requiredPageCount !== (album.page_count || 0)) {
                    albumForPlace = await smartAlbumsService.updateAlbumPageCount(
                        user.id,
                        album.id,
                        requiredPageCount
                    );
                }

                const placed = applyCollectionOrderToPages(
                    album.id,
                    {
                        ...albumForPlace,
                        has_covers: includeCovers,
                        grid_layout: finalGridLayout,
                        page_count: requiredPageCount,
                    },
                    {
                        itemIds:
                            orderedItemIds.length > 0
                                ? orderedItemIds
                                : added.filter((item) => item?.id).map((item) => item.id),
                    }
                );

                if (placed < uploadedCount) {
                    console.warn(
                        `Placed ${placed} of ${uploadedCount} photos — check album page count (${requiredPageCount} pages).`
                    );
                }
            }

            setProgress({
                label: 'Opening album editor…',
                detail: 'Almost done.',
                current: 0,
                total: 0,
            });

            await smartAlbumsService.syncAlbumPreviewData(user.id, album.id);

            navigate(`/smart-albums/album/${album.id}`, {
                state: { syncCollectionOrder: true },
            });
        } catch (err) {
            console.error('Error creating album:', err);
            setError(err.message || 'Failed to create album. Please try again.');
            setProgress(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="cc-page sa-create-page">
            <header className="cc-header">
                <div className="cc-header-left">
                    <button type="button" className="cc-back-btn" onClick={() => navigate('/smart-albums')} title="Back">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className="cc-header-title">New Album</h1>
                </div>
            </header>

            <main className="cc-main sa-create-main">
                <div className="cc-form-container sa-create-shell">
                    <div className="sa-create-intro">
                        <span className="sa-create-kicker">Smart Album Setup</span>
                        <h2>Design the album before you start editing.</h2>
                        <p>
                            Choose cover style and layout once. Upload photos to set page count and
                            grid size — they are placed automatically after the album is created.
                        </p>
                    </div>

                    {error && (
                        <div
                            className="cc-error-message"
                            style={{
                                color: '#dc2626',
                                backgroundColor: '#fef2f2',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '24px',
                                fontSize: '14px',
                                border: '1px solid #fee2e2',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreate} className="sa-create-grid">
                        <section className="sa-create-card">
                            <div className="sa-section-heading">
                                <span>Album details</span>
                                <small>Name and event date</small>
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label" htmlFor="album-name">
                                    Album Name
                                </label>
                                <input
                                    id="album-name"
                                    type="text"
                                    className="cc-input"
                                    placeholder="e.g. Wedding of Sarah & James"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label">Event Date</label>
                                <DatePicker value={date} onChange={setDate} placeholder="Select event date" />
                            </div>
                        </section>

                        <section className="sa-create-card sa-create-card--upload">
                            <div className="sa-section-heading">
                                <span>Upload photos</span>
                                <small>Page count is based on how many images you add</small>
                            </div>

                            <input
                                id="album-photos"
                                type="file"
                                className="sa-file-input-native"
                                accept="image/*,application/pdf,.pdf"
                                multiple
                                onChange={handlePhotoChange}
                            />
                            <label
                                className={`sa-upload-card${
                                    uploadDropActive ? ' sa-upload-card--drop-active' : ''
                                }`}
                                htmlFor="album-photos"
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setUploadDropActive(true);
                                }}
                                onDragLeave={() => setUploadDropActive(false)}
                                onDrop={handleUploadDrop}
                            >
                                <span className="sa-upload-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                </span>
                                <strong>Choose photos or PDF</strong>
                                <small>
                                    JPG, PNG, WEBP, or PDF · drag from folder to keep pick order
                                </small>
                            </label>

                            {previewSlots.length > 0 ? (
                                <div
                                    className={`sa-upload-preview${
                                        analyzingUploads ? ' sa-upload-preview--analyzing' : ''
                                    }`}
                                >
                                    <div
                                        className={`sa-upload-summary${
                                            analyzingUploads ? ' sa-upload-summary--busy' : ''
                                        }`}
                                    >
                                        <div className="sa-upload-summary-copy">
                                            {analyzingUploads ? (
                                                <span className="sa-upload-status">
                                                    <span className="sa-analyze-spinner" aria-hidden />
                                                    <span>Analyzing uploads…</span>
                                                </span>
                                            ) : (
                                                <span className="sa-upload-count sa-upload-count--revealed">
                                                    {displayPhotoCount} photo
                                                    {displayPhotoCount === 1 ? '' : 's'} (
                                                    {photoFiles.length} file
                                                    {photoFiles.length === 1 ? '' : 's'})
                                                </span>
                                            )}
                                            {!analyzingUploads && displayPhotoCount > 0 && layoutPreview && (
                                                <>
                                                    <span className="sa-upload-detected-size sa-upload-detected-size--revealed">
                                                        Page count: {layoutPreview.pageCount} pages
                                                        · {layoutPreview.totalSpreads} spread
                                                        {layoutPreview.totalSpreads === 1 ? '' : 's'}
                                                    </span>
                                                    <span className="sa-upload-detected-size sa-upload-detected-size--revealed">
                                                        Grid:{' '}
                                                        {formatGridSizeLabelForLayout(
                                                            detectedGridSize,
                                                            gridLayoutForDetection,
                                                            {
                                                                spreadGridSize:
                                                                    detectedSpreadGridSize,
                                                            }
                                                        )}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {analyzingUploads && (
                                            <div
                                                className="sa-analyze-progress"
                                                role="progressbar"
                                                aria-label="Analyzing uploads"
                                            >
                                                <span className="sa-analyze-progress-bar" />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setPhotoFiles([])}
                                            className="sa-upload-clear"
                                            disabled={analyzingUploads}
                                        >
                                            Clear all
                                        </button>
                                    </div>

                                    <div
                                        className="sa-preview-grid"
                                        style={{
                                            '--sa-preview-count': previewSlots.length,
                                        }}
                                    >
                                        {previewSlots.map((preview, index) => (
                                            <UploadPreviewCard
                                                key={preview.id}
                                                preview={{ ...preview, index }}
                                                index={index}
                                                onRemove={handleRemovePreview}
                                                animateIn={animatePreviewCards}
                                                onDragStart={handlePreviewDragStart}
                                                onDragOver={handlePreviewDragOver}
                                                onDrop={handlePreviewDrop}
                                                onDragEnd={handlePreviewDragEnd}
                                                isDragOver={dragOverIndex === index}
                                            />
                                        ))}
                                    </div>
                                    <p className="sa-upload-order-note">
                                        {gridLayout === 'whole-spread'
                                            ? includeCovers
                                                ? 'Order 1 → cover, 2 → spread 1 (full width), 3 → spread 2, then on.'
                                                : 'Order 1 → spread 1 (full width), 2 → spread 2, then on.'
                                            : includeCovers
                                              ? 'Order 1 → front cover right page, 2…n−1 → inner pages, last → end cover left page.'
                                              : 'Order 1 → spread 1 left, 2 → spread 1 right, 3 → spread 2 left, then on.'}{' '}
                                        Drag thumbnails if the picker order is wrong.
                                    </p>

                                    {!analyzingUploads && previewSlots.length > 0 ? (
                                        <CreateAlbumSpreadViz
                                            previewSlots={previewSlots}
                                            includeCovers={includeCovers}
                                            gridLayout={resolvedGridLayout}
                                            pageGridSize={detectedGridSize}
                                            gridSizeLabel={detectedGridLabel}
                                        />
                                    ) : null}
                                </div>
                            ) : (
                                <p className="sa-field-note">
                                    Add photos or PDFs to size the album. Without uploads, a small
                                    starter album is created.
                                </p>
                            )}

                            {createProgress && (
                                <div className="sa-create-progress" role="status" aria-live="polite">
                                    <div className="sa-create-progress-head">
                                        <span className="sa-create-progress-spinner" aria-hidden />
                                        <div>
                                            <p className="sa-create-progress-label">{createProgress.label}</p>
                                            {createProgress.detail && (
                                                <p className="sa-create-progress-detail">
                                                    {createProgress.detail}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {createProgress.total > 0 && (
                                        <div
                                            className="sa-create-progress-track"
                                            role="progressbar"
                                            aria-valuemin={0}
                                            aria-valuemax={createProgress.total}
                                            aria-valuenow={createProgress.current}
                                        >
                                            <span
                                                className="sa-create-progress-fill"
                                                style={{
                                                    width: `${Math.min(
                                                        100,
                                                        Math.round(
                                                            (createProgress.current /
                                                                createProgress.total) *
                                                                100
                                                        )
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        <section className="sa-create-card">
                            <div className="sa-section-heading">
                                <span>Locked layout</span>
                                <small>Cannot be changed after creation</small>
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label" htmlFor="album-cover-mode">
                                    Covers
                                </label>
                                <CustomSelect
                                    id="album-cover-mode"
                                    value={coverMode}
                                    options={COVER_OPTIONS}
                                    onChange={setCoverMode}
                                />
                                <p className="sa-field-note">
                                    {includeCovers
                                        ? 'First photo on the front cover right page (left blank); last photo on the end cover left page (right blank). Middle photos fill inner pages.'
                                        : 'All uploaded photos fill pages in order — no dedicated cover spreads.'}
                                </p>
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label" htmlFor="album-grid-layout">
                                    Grid Layout
                                </label>
                                <CustomSelect
                                    id="album-grid-layout"
                                    value={gridLayout}
                                    options={GRID_LAYOUT_OPTIONS}
                                    onChange={setGridLayout}
                                />
                                {gridLayout === 'custom' && (
                                    <input
                                        type="text"
                                        className="cc-input sa-custom-input"
                                        value={customGridLayout}
                                        onChange={(e) => setCustomGridLayout(e.target.value)}
                                        placeholder="Custom layout label"
                                        required
                                    />
                                )}
                            </div>

                            <p className="sa-field-note">
                                Layout and cover mode are locked after the album is created.
                                    {displayPhotoCount > 0 && !analyzingUploads ? (
                                    <>
                                        {' '}
                                        Detected grid:{' '}
                                        {formatGridSizeLabelForLayout(
                                            detectedGridSize,
                                            gridLayoutForDetection,
                                            { spreadGridSize: detectedSpreadGridSize }
                                        )}
                                        .
                                    </>
                                ) : (
                                    <> Grid size is detected from your uploads.</>
                                )}
                            </p>
                        </section>

                        <div className="cc-actions sa-create-actions">
                            <button type="submit" className="cc-submit-btn" disabled={isSubmitting}>
                                {isSubmitting ? 'Creating...' : 'Create Album'}
                            </button>
                            <button type="button" className="cc-cancel-btn" onClick={() => navigate('/smart-albums')}>
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateAlbum;
