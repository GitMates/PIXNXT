import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '../../components/ui/DatePicker';
import { addFilesToAlbumCollection } from '../../components/smart-albums/albumCollection';
import { applyCollectionOrderToPages } from '../../components/smart-albums/albumPagePhotos';
import { useAuth } from '../../hooks/useAuth';
import { ensureAuthSession, isAuthExpiredError } from '../../services/auth.service';
import { galleryService } from '../../services/gallery.service';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    blankCoverSpreadGridSize,
    detectGridSizesFromFiles,
    getAlbumUploadPixelTarget,
    loadImageDimensionsFromFile,
    spreadAspectFromPageGrid,
    spreadGridSizeFromPageGrid,
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
import { resolveCreateUploadPreviewLayout } from './createAlbumPreviewLayout';
import { isImageFile, isPdfFile } from '../../lib/pdfToImages';
import {
    filesFromDataTransfer,
    filesFromInput,
    moveFileInOrder,
    moveItemInOrder,
} from '../../lib/uploadFileOrder';
import {
    collectionMatchesGallerySearch,
    normalizeGallerySearchQuery,
} from '../../utils/filterClientGallerySearch';
import './CreateAlbum.css';
import { AppToast, useAppToast } from '../../components/ui/AppToast';

const FILMSTRIP_GAP_PX = 10;
const FILMSTRIP_DRAG_THRESHOLD_PX = 4;

function resolveFilmstripOverIndex(deltaX, itemWidth, fromIndex, length) {
    if (!(itemWidth > 0) || length < 1) return fromIndex;
    const displacement = Math.round(deltaX / itemWidth);
    return Math.max(0, Math.min(length - 1, fromIndex + displacement));
}

function getFilmstripTileTransform(index, drag) {
    if (!drag) return null;
    const { fromIndex, overIndex, deltaX, itemWidth } = drag;
    if (index === fromIndex) {
        return `translate3d(${deltaX}px, 0, 0) scale(1.04)`;
    }
    if (fromIndex < overIndex && index > fromIndex && index <= overIndex) {
        return `translate3d(${-itemWidth}px, 0, 0)`;
    }
    if (fromIndex > overIndex && index >= overIndex && index < fromIndex) {
        return `translate3d(${itemWidth}px, 0, 0)`;
    }
    return null;
}

function collectionEventDateValue(eventDate) {
    if (!eventDate) return '';
    const match = String(eventDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(eventDate);
    if (Number.isNaN(parsed.getTime())) return '';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatSuggestionDate(eventDate) {
    const value = collectionEventDateValue(eventDate);
    if (!value) return 'No date';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'No date';
    return parsed.toLocaleDateString();
}

function sortPreviewSlotsByFileName(slots) {
    return [...slots].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
}

async function detectCreateAlbumGridSizes(coverFile, photoFiles, gridLayout) {
    const innerGrid = photoFiles.length
        ? await detectGridSizesFromFiles(photoFiles, {
            gridLayout,
            hasCovers: true,
            blankCovers: true,
        }).catch(() => ({ pageGridSize: 'square', spreadGridSize: null }))
        : { pageGridSize: 'square', spreadGridSize: null };

    if (coverFile) {
        // spread_grid_size = inner spread from photos; cover wrap aspect comes from the cover image at runtime.
        return {
            pageGridSize: innerGrid.pageGridSize,
            spreadGridSize:
                innerGrid.spreadGridSize ??
                spreadGridSizeFromPageGrid(innerGrid.pageGridSize, gridLayout) ??
                blankCoverSpreadGridSize(innerGrid.pageGridSize),
        };
    }

    return detectGridSizesFromFiles(photoFiles, {
        gridLayout,
        hasCovers: true,
        blankCovers: true,
    });
}

function formatFileSize(bytes) {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

async function loadImageDimensionsFromUrl(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => reject(new Error('Could not read image'));
        img.src = url;
    });
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
    roleLabel = null,
    spreadLayout = null,
    spreadAspect = 2,
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
    const spreadMode = spreadLayout?.mode;
    const isSpreadPreview = spreadMode === 'spread-whole' || spreadMode === 'spread-half';
    const spreadSide = spreadLayout?.side;

    const previewImage = preview.url ? (
        <img
            ref={imgRef}
            className={`sa-preview-img${imageLoaded ? ' sa-preview-img--loaded' : ''}${
                isSpreadPreview ? ' sa-preview-img--spread' : ''
            }`}
            src={preview.url}
            alt={preview.name}
            decoding="async"
            loading="lazy"
            draggable={false}
            onLoad={handleImageLoad}
        />
    ) : null;

    const spreadMedia =
        isSpreadPreview && previewImage ? (
            spreadMode === 'spread-whole' ? (
                <div className="sa-preview-spread sa-preview-spread--whole">
                    <div className="sa-preview-spread-page sa-preview-spread-page--full">
                        {previewImage}
                    </div>
                </div>
            ) : (
                <div className="sa-preview-spread">
                    <div className="sa-preview-spread-page">
                        {spreadSide === 'left' ? previewImage : null}
                    </div>
                    <div className="sa-preview-spread-page">
                        {spreadSide === 'right' ? previewImage : null}
                    </div>
                </div>
            )
        ) : null;

    return (
        <figure
            className={`sa-preview-card${showSkeleton ? '' : ' sa-preview-card--ready'}${animateIn ? ' sa-preview-card--animate-in' : ''
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
            {roleLabel ? (
                <span className="sa-preview-role" aria-hidden>
                    {roleLabel}
                </span>
            ) : null}
            <button
                type="button"
                className="sa-preview-remove"
                onClick={() => onRemove(preview)}
                aria-label={`Remove ${preview.name}`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
            <div
                className={`sa-preview-media${isSpreadPreview ? ' sa-preview-media--spread' : ''}`}
                style={
                    isSpreadPreview
                        ? { '--sa-preview-spread-aspect': spreadAspect }
                        : undefined
                }
            >
                {preview.url ? (
                    <>
                        {showSkeleton && <div className="sa-preview-skeleton" aria-hidden />}
                        {spreadMedia ?? previewImage}
                    </>
                ) : !preview.thumbReady ? (
                    <div
                        className={`sa-preview-loading${preview.isPdfPage ? ' sa-preview-loading--pdf' : ''
                            }`}
                        aria-busy="true"
                    >
                        <div
                            className={`sa-preview-skeleton${preview.isPdfPage ? '' : ' sa-preview-skeleton--fill'
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
    const { toast, showToast, clearToast } = useAppToast(4500);
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [clientName, setClientName] = useState('');
    const [galleryCollections, setGalleryCollections] = useState([]);
    const [nameSuggestOpen, setNameSuggestOpen] = useState(false);
    const [activeNameSuggestionIndex, setActiveNameSuggestionIndex] = useState(-1);
    const nameAutocompleteRef = useRef(null);
    const [clientSuggestOpen, setClientSuggestOpen] = useState(false);
    const [activeClientSuggestionIndex, setActiveClientSuggestionIndex] = useState(-1);
    const clientAutocompleteRef = useRef(null);
    const [spreadOrderMode, setSpreadOrderMode] = useState('selected');
    const [coverFile, setCoverFile] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);
    const [coverDropActive, setCoverDropActive] = useState(false);
    const [gridLayout] = useState('whole-spread');
    const [detectedGridSize, setDetectedGridSize] = useState('square');
    const [detectedSpreadGridSize, setDetectedSpreadGridSize] = useState(null);

    const [photoFiles, setPhotoFiles] = useState([]);
    const [previewSlots, setPreviewSlots] = useState([]);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [uploadDropActive, setUploadDropActive] = useState(false);
    const dragFromIndexRef = useRef(null);
    const [filmstripDrag, setFilmstripDrag] = useState(null);
    const [expandedPhotoCount, setExpandedPhotoCount] = useState(0);
    const [photoCountBusy, setPhotoCountBusy] = useState(false);
    const [gridSizeBusy, setGridSizeBusy] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createProgress, setCreateProgress] = useState(null);
    const [error, setError] = useState(null);
    const [wizardStep, setWizardStep] = useState(1);
    const coverInputRef = useRef(null);
    const photosInputRef = useRef(null);
    const filmstripRef = useRef(null);
    const filmstripTileRefs = useRef([]);
    const filmstripAutoScrollRafRef = useRef(null);
    const filmstripAutoScrollVelocityRef = useRef(0);

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;
        html.style.overflow = '';
        body.style.overflow = '';
        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    useEffect(() => {
        if (!user?.id) {
            setGalleryCollections([]);
            return undefined;
        }

        let cancelled = false;
        ensureAuthSession()
            .then(({ user: activeUser }) =>
                galleryService.getCollections(activeUser.id)
            )
            .then((rows) => {
                if (!cancelled) setGalleryCollections(rows || []);
            })
            .catch(() => {
                if (!cancelled) setGalleryCollections([]);
            });

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    useEffect(() => {
        const onDocDown = (e) => {
            if (!nameAutocompleteRef.current?.contains(e.target)) {
                setNameSuggestOpen(false);
                setActiveNameSuggestionIndex(-1);
            }
            if (!clientAutocompleteRef.current?.contains(e.target)) {
                setClientSuggestOpen(false);
                setActiveClientSuggestionIndex(-1);
            }
        };
        document.addEventListener('mousedown', onDocDown);
        return () => document.removeEventListener('mousedown', onDocDown);
    }, []);

    const nameSuggestions = useMemo(() => {
        const query = normalizeGallerySearchQuery(name);
        if (!query || !galleryCollections.length) return [];
        return galleryCollections
            .filter((collection) => collectionMatchesGallerySearch(collection, query))
            .slice(0, 8);
    }, [name, galleryCollections]);

    const showNameSuggestions =
        nameSuggestOpen && name.trim().length > 0 && nameSuggestions.length > 0;

    const handleNameChange = useCallback((e) => {
        setName(e.target.value);
        setNameSuggestOpen(true);
        setActiveNameSuggestionIndex(-1);
        if (error) setError(null);
    }, [error]);

    const handleSelectNameSuggestion = useCallback((collection) => {
        setName(collection?.name || '');
        if (collection?.event_date) {
            setDate(collectionEventDateValue(collection.event_date));
        }
        setNameSuggestOpen(false);
        setActiveNameSuggestionIndex(-1);
        if (typeof document !== 'undefined') {
            const el = document.getElementById('album-name');
            if (el) el.blur();
        }
    }, []);

    const handleNameKeyDown = useCallback(
        (e) => {
            if (!showNameSuggestions) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveNameSuggestionIndex((prev) =>
                    prev < nameSuggestions.length - 1 ? prev + 1 : 0
                );
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveNameSuggestionIndex((prev) =>
                    prev > 0 ? prev - 1 : nameSuggestions.length - 1
                );
                return;
            }

            if (e.key === 'Enter' && activeNameSuggestionIndex >= 0) {
                e.preventDefault();
                const selected = nameSuggestions[activeNameSuggestionIndex];
                if (selected) handleSelectNameSuggestion(selected);
                return;
            }

            if (e.key === 'Escape') {
                setNameSuggestOpen(false);
                setActiveNameSuggestionIndex(-1);
            }
        },
        [
            showNameSuggestions,
            nameSuggestions,
            activeNameSuggestionIndex,
            handleSelectNameSuggestion,
        ]
    );

    const clientSuggestions = useMemo(() => {
        const query = normalizeGallerySearchQuery(clientName);
        if (!query || !galleryCollections.length) return [];
        return galleryCollections
            .filter((collection) => collectionMatchesGallerySearch(collection, query))
            .slice(0, 8);
    }, [clientName, galleryCollections]);

    const showClientSuggestions =
        clientSuggestOpen && clientName.trim().length > 0 && clientSuggestions.length > 0;

    const handleClientChange = useCallback((e) => {
        setClientName(e.target.value);
        setClientSuggestOpen(true);
        setActiveClientSuggestionIndex(-1);
    }, []);

    const handleSelectClientSuggestion = useCallback((collection) => {
        setClientName(collection?.name || '');
        if (!date && collection?.event_date) {
            setDate(collectionEventDateValue(collection.event_date));
        }
        setClientSuggestOpen(false);
        setActiveClientSuggestionIndex(-1);
        if (typeof document !== 'undefined') {
            const el = document.getElementById('album-client');
            if (el) el.blur();
        }
    }, [date]);

    const handleClientKeyDown = useCallback(
        (e) => {
            if (!showClientSuggestions) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveClientSuggestionIndex((prev) =>
                    prev < clientSuggestions.length - 1 ? prev + 1 : 0
                );
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveClientSuggestionIndex((prev) =>
                    prev > 0 ? prev - 1 : clientSuggestions.length - 1
                );
                return;
            }

            if (e.key === 'Enter' && activeClientSuggestionIndex >= 0) {
                e.preventDefault();
                const selected = clientSuggestions[activeClientSuggestionIndex];
                if (selected) handleSelectClientSuggestion(selected);
                return;
            }

            if (e.key === 'Escape') {
                setClientSuggestOpen(false);
                setActiveClientSuggestionIndex(-1);
            }
        },
        [
            showClientSuggestions,
            clientSuggestions,
            activeClientSuggestionIndex,
            handleSelectClientSuggestion,
        ]
    );

    const orderedPreviewSlots = useMemo(() => {
        if (spreadOrderMode === 'filename') {
            return sortPreviewSlotsByFileName(previewSlots);
        }
        return previewSlots;
    }, [previewSlots, spreadOrderMode]);

    const albumTitleLabel = name.trim() || 'your album';
    const canContinue = Boolean(name.trim());
    const canCreate = previewSlots.length > 0 && !isSubmitting;
    const blankCovers = true;
    const includeCoverSpreads = true;
    const hasCoverImage = Boolean(coverFile);

    const resolvedGridLayout = gridLayout;
    const gridLayoutForDetection = gridLayout;

    const displayPhotoCount =
        previewSlots.length > 0 ? previewSlots.length : expandedPhotoCount;

    const layoutPreview = useMemo(() => {
        if (!displayPhotoCount) return null;
        const pageCount = computePageCountFromPhotoCount(displayPhotoCount, {
            includeCovers: includeCoverSpreads,
            blankCovers,
            gridLayout: resolvedGridLayout,
        });
        return describeAlbumLayout(displayPhotoCount, pageCount, {
            includeCovers: includeCoverSpreads,
            blankCovers,
            gridLayout: resolvedGridLayout,
        });
    }, [displayPhotoCount, blankCovers, includeCoverSpreads, resolvedGridLayout]);

    const previewSpreadAspect = useMemo(
        () => spreadAspectFromPageGrid(detectedGridSize),
        [detectedGridSize]
    );

    const previewSpreadLayouts = useMemo(
        () =>
            previewSlots.map((_, slotIndex) =>
                resolveCreateUploadPreviewLayout(slotIndex, previewSlots, {
                    pageGridSize: detectedGridSize,
                    gridLayout: resolvedGridLayout,
                    blankCovers,
                    includeCovers: includeCoverSpreads,
                })
            ),
        [
            previewSlots,
            detectedGridSize,
            resolvedGridLayout,
            blankCovers,
            includeCoverSpreads,
        ]
    );

    const setProgress = (next) => {
        setCreateProgress(next);
    };

    useEffect(() => {
        if (!coverFile) {
            setCoverPreview(null);
            return undefined;
        }

        const abort = new AbortController();
        let blobUrl = null;

        const buildCoverPreview = async () => {
            const fileKey = `${coverFile.name}-${coverFile.lastModified}-${coverFile.size}`;

            if (isImageFile(coverFile)) {
                blobUrl = URL.createObjectURL(coverFile);
                if (abort.signal.aborted) return;
                setCoverPreview({
                    id: `${fileKey}-img`,
                    name: coverFile.name,
                    size: coverFile.size,
                    url: blobUrl,
                    thumbReady: true,
                    isPdfPage: false,
                });
                return;
            }

            if (isPdfFile(coverFile)) {
                const baseName = (coverFile.name || 'document.pdf').replace(/\.pdf$/i, '');
                setCoverPreview({
                    id: `${fileKey}-p0`,
                    name: baseName,
                    size: coverFile.size,
                    url: null,
                    thumbReady: false,
                    isPdfPage: true,
                });
                let url = null;
                try {
                    url = await createPdfPagePreviewThumbUrl(coverFile, 1);
                } catch {
                    url = null;
                }
                if (abort.signal.aborted) return;
                setCoverPreview({
                    id: `${fileKey}-p0`,
                    name: baseName,
                    size: coverFile.size,
                    url: url || null,
                    thumbReady: true,
                    isPdfPage: true,
                });
            }
        };

        void buildCoverPreview();

        return () => {
            abort.abort();
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [coverFile]);

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
                    let width = null;
                    let height = null;
                    try {
                        const dims = await loadImageDimensionsFromFile(file);
                        width = dims.width;
                        height = dims.height;
                    } catch {
                        width = null;
                        height = null;
                    }
                    slots.push({
                        id: `${fileKey}-img`,
                        fileIndex,
                        pageIndex: null,
                        name: file.name,
                        size: file.size,
                        url,
                        width,
                        height,
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
                let width = null;
                let height = null;
                try {
                    url = await createPdfPagePreviewThumbUrl(file, slot.pageIndex + 1);
                    if (url) {
                        const dims = await loadImageDimensionsFromUrl(url);
                        width = dims.width;
                        height = dims.height;
                    }
                } catch {
                    url = null;
                }
                if (abort.signal.aborted) return;
                setPreviewSlots((prev) =>
                    prev.map((item) =>
                        item.id === slot.id
                            ? {
                                  ...item,
                                  url: url || null,
                                  width,
                                  height,
                                  thumbReady: true,
                              }
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
        if (!photoFiles.length && !coverFile) {
            setExpandedPhotoCount(0);
            setDetectedGridSize('square');
            setDetectedSpreadGridSize(null);
            setPhotoCountBusy(false);
            setGridSizeBusy(false);
            return undefined;
        }

        if (!photoFiles.length) {
            setExpandedPhotoCount(0);
        }

        let cancelled = false;
        setPhotoCountBusy(Boolean(photoFiles.length));
        setGridSizeBusy(true);

        const runAnalysis = () => {
            if (cancelled) return;
            const tasks = [];
            if (photoFiles.length) {
                tasks.push(
                    countExpandedUploadPhotos(photoFiles).catch(() => photoFiles.length)
                );
            } else {
                tasks.push(Promise.resolve(0));
            }
            tasks.push(
                detectCreateAlbumGridSizes(coverFile, photoFiles, gridLayoutForDetection).catch(
                    () => ({ pageGridSize: 'square', spreadGridSize: null })
                )
            );

            Promise.all(tasks)
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
    }, [photoFiles, coverFile, gridLayoutForDetection]);

    const analyzingUploads = photoCountBusy || gridSizeBusy;

    const formatUploadSize = useCallback((bytes) => {
        const n = Number(bytes) || 0;
        if (n <= 0) return '';
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
        return `${(n / (1024 * 1024)).toFixed(1)}MB`;
    }, []);

    const handleContinueToUploads = useCallback(async (e) => {
        e?.preventDefault?.();
        if (!name.trim()) {
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            if (user?.id) {
                const existing = await smartAlbumsService.getAlbums(user.id);
                const nameExists = existing.some(
                    (a) => a.name.trim().toLowerCase() === name.trim().toLowerCase()
                );
                if (nameExists) {
                    setError('An album with this name already exists.');
                    setIsSubmitting(false);
                    return;
                }
            }
            setError(null);
            setWizardStep(2);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    }, [name, user?.id]);

    const handleBackToDetails = useCallback(() => {
        setWizardStep(1);
        setError(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const applyPhotoFiles = useCallback((files) => {
        if (!files?.length) return;
        setPhotoFiles((prev) => {
            if (!prev.length) return [...files];
            const existingNames = new Set(prev.map((f) => f.name.toLowerCase()));
            const duplicates = files.filter((f) => existingNames.has(f.name.toLowerCase()));
            if (duplicates.length) {
                const names = duplicates.map((f) => f.name).join(', ');
                setTimeout(() => {
                    showToast(`Duplicate image(s) skipped: ${names}`, {
                        variant: 'success',
                        duration: 5000,
                    });
                }, 0);
                const newOnly = files.filter((f) => !existingNames.has(f.name.toLowerCase()));
                return newOnly.length ? [...prev, ...newOnly] : prev;
            }
            return [...prev, ...files];
        });
    }, [showToast]);



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

    const stopFilmstripAutoScroll = useCallback(() => {
        if (filmstripAutoScrollRafRef.current != null) {
            cancelAnimationFrame(filmstripAutoScrollRafRef.current);
            filmstripAutoScrollRafRef.current = null;
        }
        filmstripAutoScrollVelocityRef.current = 0;
    }, []);

    const runFilmstripEdgeScroll = useCallback((clientX) => {
        const strip = filmstripRef.current;
        if (!strip) return;

        const rect = strip.getBoundingClientRect();
        const edgeZone = 72;
        const maxSpeed = 20;

        let velocity = 0;
        if (clientX < rect.left + edgeZone) {
            const t = Math.min(1, (rect.left + edgeZone - clientX) / edgeZone);
            velocity = -(3 + t * (maxSpeed - 3));
        } else if (clientX > rect.right - edgeZone) {
            const t = Math.min(1, (clientX - (rect.right - edgeZone)) / edgeZone);
            velocity = 3 + t * (maxSpeed - 3);
        }

        filmstripAutoScrollVelocityRef.current = velocity;

        if (!velocity) {
            if (filmstripAutoScrollRafRef.current != null) {
                cancelAnimationFrame(filmstripAutoScrollRafRef.current);
                filmstripAutoScrollRafRef.current = null;
            }
            return;
        }

        if (filmstripAutoScrollRafRef.current != null) return;

        const tick = () => {
            filmstripAutoScrollRafRef.current = null;
            const s = filmstripRef.current;
            const v = filmstripAutoScrollVelocityRef.current;
            if (!s || !v) return;

            const max = Math.max(0, s.scrollWidth - s.clientWidth);
            const next = Math.min(max, Math.max(0, s.scrollLeft + v));
            s.scrollLeft = next;

            if ((next <= 0 && v < 0) || (next >= max && v > 0)) {
                filmstripAutoScrollVelocityRef.current = 0;
                return;
            }
            filmstripAutoScrollRafRef.current = requestAnimationFrame(tick);
        };
        filmstripAutoScrollRafRef.current = requestAnimationFrame(tick);
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

    const handleFilmstripPointerDown = useCallback((e, index) => {
        if (e.button !== 0) return;
        if (e.target?.closest?.('.sa-filmstrip-tile-remove')) return;
        const tile = filmstripTileRefs.current[index];
        if (!tile) return;

        e.preventDefault();
        const rect = tile.getBoundingClientRect();
        setFilmstripDrag({
            fromIndex: index,
            overIndex: index,
            startX: e.clientX,
            deltaX: 0,
            itemWidth: rect.width + FILMSTRIP_GAP_PX,
            pointerId: e.pointerId,
        });
    }, []);

    useEffect(() => {
        if (!filmstripDrag) return undefined;

        const { pointerId, fromIndex, startX, itemWidth } = filmstripDrag;

        const onMove = (e) => {
            if (e.pointerId !== pointerId) return;
            e.preventDefault();

            const deltaX = e.clientX - startX;
            const overIndex = resolveFilmstripOverIndex(
                deltaX,
                itemWidth,
                fromIndex,
                previewSlots.length
            );

            setFilmstripDrag((prev) =>
                prev && prev.pointerId === pointerId
                    ? {
                          ...prev,
                          deltaX,
                          overIndex,
                      }
                    : prev
            );
            runFilmstripEdgeScroll(e.clientX);
        };

        const finish = (e) => {
            if (e.pointerId !== pointerId) return;

            stopFilmstripAutoScroll();
            document.body.style.userSelect = '';

            const deltaX = e.clientX - startX;
            const overIndex = resolveFilmstripOverIndex(
                deltaX,
                itemWidth,
                fromIndex,
                previewSlots.length
            );

            if (
                Math.abs(deltaX) < FILMSTRIP_DRAG_THRESHOLD_PX &&
                overIndex === fromIndex
            ) {
                // tap — keep order
            } else if (fromIndex !== overIndex) {
                setPreviewSlots((prev) => moveItemInOrder(prev, fromIndex, overIndex));
            }

            setFilmstripDrag(null);
        };

        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', finish);
        window.addEventListener('pointercancel', finish);

        return () => {
            document.body.style.userSelect = '';
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', finish);
            window.removeEventListener('pointercancel', finish);
        };
    }, [
        filmstripDrag?.pointerId,
        filmstripDrag?.fromIndex,
        filmstripDrag?.startX,
        filmstripDrag?.itemWidth,
        previewSlots.length,
        runFilmstripEdgeScroll,
        stopFilmstripAutoScroll,
    ]);

    useEffect(() => {
        if (filmstripDrag) return undefined;
        stopFilmstripAutoScroll();
        return undefined;
    }, [filmstripDrag, stopFilmstripAutoScroll]);

    useEffect(() => () => stopFilmstripAutoScroll(), [stopFilmstripAutoScroll]);

    const handleRemovePreview = useCallback((slot) => {
        if (!slot) return;
        setPhotoFiles((prev) => prev.filter((_, index) => index !== slot.fileIndex));
    }, []);

    const applyCoverFile = useCallback((files) => {
        const file = files?.[0];
        if (file && (isImageFile(file) || isPdfFile(file))) {
            setCoverFile(file);
        }
    }, []);

    const handleCoverChange = (e) => {
        applyCoverFile(filesFromInput(e.target.files));
        e.target.value = '';
    };

    const handleCoverDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setCoverDropActive(false);
            applyCoverFile(filesFromDataTransfer(e.dataTransfer));
        },
        [applyCoverFile]
    );

    const handleRemoveCover = useCallback(() => {
        setCoverFile(null);
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to create an album.');
            setProgress(null);
            return;
        }
        if (!previewSlots.length) {
            return;
        }

        const slotsForCreate = orderedPreviewSlots;

        setIsSubmitting(true);
        setError(null);
        setProgress({
            label: 'Starting album creation…',
            detail: null,
            current: 0,
            total: 0,
        });

        try {
            const finalGridLayout = gridLayout;

            let photoCount = displayPhotoCount || expandedPhotoCount;
            let finalGridSize = detectedGridSize;
            let finalSpreadGridSize = detectedSpreadGridSize;
            if (photoFiles.length > 0 || coverFile) {
                if (photoFiles.length > 0) {
                    const expanded = await countExpandedUploadPhotos(photoFiles).catch(
                        () => photoFiles.length
                    );
                    photoCount = Math.max(
                        previewSlots.length,
                        expanded,
                        photoFiles.length
                    );
                }
                const gridSizes = await detectCreateAlbumGridSizes(
                    coverFile,
                    photoFiles,
                    finalGridLayout
                );
                finalGridSize = gridSizes.pageGridSize;
                finalSpreadGridSize = gridSizes.spreadGridSize;
            }
            if (blankCovers && !finalSpreadGridSize) {
                finalSpreadGridSize = blankCoverSpreadGridSize(finalGridSize);
            }

            const finalPageCount = computePageCountFromPhotoCount(photoCount, {
                includeCovers: includeCoverSpreads,
                blankCovers,
                gridLayout: finalGridLayout,
            });

            setProgress({
                label: 'Creating album record…',
                detail: 'Saving layout settings.',
                current: 0,
                total: 0,
            });

            const { user: activeUser } = await ensureAuthSession();

            const album = await smartAlbumsService.createAlbum({
                photographer_id: activeUser.id,
                name,
                event_date: date || null,
                page_count: finalPageCount,
                grid_size: finalGridSize,
                spread_grid_size: finalSpreadGridSize,
                grid_layout: finalGridLayout,
                has_covers: includeCoverSpreads,
                blank_covers: blankCovers,
            });

            const trimmedClient = clientName.trim();
            if (trimmedClient) {
                await smartAlbumsService.updateAlbumClientSettings(activeUser.id, album.id, {
                    client_contact_name: trimmedClient,
                });
            }

            if (coverFile || photoFiles.length > 0) {
                const uploadAlbumMeta = {
                    grid_size: finalGridSize,
                    spread_grid_size: finalSpreadGridSize,
                    grid_layout: finalGridLayout,
                    blank_covers: blankCovers,
                };

                if (coverFile) {
                    setProgress({
                        label: 'Uploading cover image…',
                        detail: 'Saving book wrap to your album.',
                        current: 0,
                        total: 1,
                    });
                    await addFilesToAlbumCollection(album.id, [coverFile], {
                        photographerId: activeUser.id,
                        skipDuplicateCheck: true,
                        coverWrap: true,
                        album: uploadAlbumMeta,
                        compressionTarget: getAlbumUploadPixelTarget(uploadAlbumMeta, {
                            coverWrap: true,
                        }),
                    });
                }

                let added = [];
                if (photoFiles.length > 0) {
                    added = await addFilesToAlbumCollection(album.id, photoFiles, {
                        photographerId: activeUser.id,
                        skipDuplicateCheck: true,
                        album: uploadAlbumMeta,
                        compressionTarget: getAlbumUploadPixelTarget(uploadAlbumMeta),
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
                }

                setProgress({
                    label: 'Placing photos on spreads…',
                    detail: hasCoverImage
                        ? 'Setting cover and auto-filling inner pages.'
                        : 'Auto-filling inner pages from your uploads.',
                    current: 0,
                    total: 0,
                });

                const uploadedCount = added.filter((item) => item?.id).length;
                const orderedItemIds = collectionItemIdsForPreviewSlots(
                    photoFiles,
                    added,
                    slotsForCreate
                );
                const effectivePhotoCount = Math.max(
                    photoCount,
                    orderedItemIds.length,
                    uploadedCount,
                    displayPhotoCount
                );
                const requiredPageCount = computePageCountFromPhotoCount(effectivePhotoCount, {
                    includeCovers: includeCoverSpreads,
                    blankCovers,
                    gridLayout: finalGridLayout,
                });

                let albumForPlace = album;
                if (requiredPageCount !== (album.page_count || 0)) {
                    albumForPlace = await smartAlbumsService.updateAlbumPageCount(
                        activeUser.id,
                        album.id,
                        requiredPageCount
                    );
                }

                const placed = await applyCollectionOrderToPages(
                    album.id,
                    {
                        ...albumForPlace,
                        has_covers: includeCoverSpreads,
                        blank_covers: blankCovers,
                        grid_layout: finalGridLayout,
                        page_count: requiredPageCount,
                    },
                    orderedItemIds.length > 0 ? { itemIds: orderedItemIds } : {}
                );

                if (photoFiles.length > 0 && placed < uploadedCount) {
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

            const { user: syncUser } = await ensureAuthSession();
            await smartAlbumsService.syncAlbumPreviewData(syncUser.id, album.id);

            navigate(`/album-proofer/album/${album.id}`, {
                state: { syncCollectionOrder: true },
            });
        } catch (err) {
            console.error('Error creating album:', err);
            setError(
                isAuthExpiredError(err)
                    ? 'Your session has expired. Please sign in again.'
                    : err.message || 'Failed to create album. Please try again.'
            );
            setProgress(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
        <div className="cc-page sa-create-page sa-create-wizard-page">
            <main className="cc-main sa-create-main sa-create-wizard-main">
                <div className="sa-create-wizard">
                    <div className="sa-wizard-header">
                        <div className="sa-wizard-header-row">
                            <h1 className="sa-wizard-title">New album</h1>
                            <span className="sa-wizard-step-label">
                                {wizardStep === 1
                                    ? 'STEP 1 OF 2  ALBUM DETAILS'
                                    : 'STEP 2 OF 2  UPLOAD SPREADS'}
                            </span>
                        </div>
                        <div className="sa-wizard-progress-line" aria-hidden>
                            <span
                                className={`sa-wizard-progress-accent${
                                    wizardStep === 2 ? ' sa-wizard-progress-accent--full' : ''
                                }`}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="sa-wizard-error" role="alert">
                            {error}
                        </div>
                    )}

                    <form
                        onSubmit={(e) => {
                            if (wizardStep === 1) {
                                handleContinueToUploads(e);
                                return;
                            }
                            handleCreate(e);
                        }}
                        className="sa-wizard-form"
                    >
                        <input
                            id="album-cover-image"
                            ref={coverInputRef}
                            type="file"
                            className="sa-file-input-native"
                            accept="image/*,application/pdf,.pdf"
                            onChange={handleCoverChange}
                        />
                        <input
                            id="album-photos"
                            ref={photosInputRef}
                            type="file"
                            className="sa-file-input-native"
                            accept="image/*,application/pdf,.pdf"
                            multiple
                            onChange={handlePhotoChange}
                        />
                        {wizardStep === 1 ? (
                            <section className="sa-wizard-card sa-wizard-card--step1">
                                <div className="sa-wizard-card-body">
                                    <div className="sa-wizard-card-intro">
                                        <span className="sa-create-kicker">ALBUM PROOFER SETUP</span>
                                        <h2>Name the album and set the event date.</h2>
                                        <p className="sa-wizard-card-lead">
                                            You&apos;ll upload the spreads next. Nothing is shared with the client until
                                            you publish.
                                        </p>
                                    </div>

                                    <div className="sa-wizard-fields sa-wizard-fields--step1">
                                        <div className="sa-wizard-fields-row">
                                            <div className="cc-form-group">
                                                <label className="cc-label" htmlFor="album-name">
                                                    ALBUM NAME <span className="sa-label-required">*</span>
                                                </label>
                                                <div
                                                    className={`sa-name-autocomplete${showNameSuggestions ? ' sa-name-autocomplete--open' : ''}`}
                                                    ref={nameAutocompleteRef}
                                                >
                                                    <input
                                                        id="album-name"
                                                        type="text"
                                                        className="cc-input"
                                                        placeholder="Wedding of Sarah & James"
                                                        value={name}
                                                        onChange={handleNameChange}
                                                        onFocus={() => setNameSuggestOpen(true)}
                                                        onKeyDown={handleNameKeyDown}
                                                        autoComplete="off"
                                                        aria-autocomplete="list"
                                                        aria-expanded={showNameSuggestions}
                                                        aria-controls="album-name-suggestions"
                                                        required
                                                    />
                                                    {showNameSuggestions ? (
                                                        <div
                                                            id="album-name-suggestions"
                                                            className="sa-name-suggest-menu"
                                                            role="listbox"
                                                            aria-label="Matching gallery deliveries"
                                                        >
                                                            {nameSuggestions.map((collection, index) => {
                                                                const isActive = index === activeNameSuggestionIndex;
                                                                return (
                                                                    <button
                                                                        key={collection.id}
                                                                        type="button"
                                                                        className={`sa-name-suggest-option${isActive ? ' sa-name-suggest-option--active' : ''}`}
                                                                        role="option"
                                                                        aria-selected={isActive}
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={() =>
                                                                            handleSelectNameSuggestion(collection)
                                                                        }
                                                                    >
                                                                        <span className="sa-name-suggest-title">
                                                                            {collection.name}
                                                                        </span>
                                                                        <span className="sa-name-suggest-meta">
                                                                            {formatSuggestionDate(collection.event_date)}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="cc-form-group">
                                                <div className="sa-field-label-row">
                                                    <label className="cc-label" htmlFor="album-event-date">
                                                        EVENT DATE
                                                    </label>
                                                    <span className="sa-field-optional">Optional</span>
                                                </div>
                                                <DatePicker
                                                    value={date}
                                                    onChange={setDate}
                                                    placeholder="dd-mm-yyyy"
                                                    displayFormat="dd-mm-yyyy"
                                                    showQuickSearch={false}
                                                    className="sa-wizard-datepicker"
                                                />
                                            </div>
                                        </div>

                                        <div className="cc-form-group">
                                            <div className="sa-field-label-row">
                                                <label className="cc-label" htmlFor="album-client">
                                                    CLIENT
                                                </label>
                                                <span className="sa-field-optional">Optional</span>
                                            </div>
                                        <div
                                            className={`sa-name-autocomplete${showClientSuggestions ? ' sa-name-autocomplete--open' : ''}`}
                                            ref={clientAutocompleteRef}
                                        >
                                            <input
                                                id="album-client"
                                                type="text"
                                                className="cc-input"
                                                placeholder="Search a client, or type a new name"
                                                value={clientName}
                                                onChange={handleClientChange}
                                                onFocus={() => setClientSuggestOpen(true)}
                                                onKeyDown={handleClientKeyDown}
                                                autoComplete="off"
                                                aria-autocomplete="list"
                                                aria-expanded={showClientSuggestions}
                                                aria-controls="album-client-suggestions"
                                            />
                                            {showClientSuggestions ? (
                                                <div
                                                    id="album-client-suggestions"
                                                    className="sa-name-suggest-menu"
                                                    role="listbox"
                                                    aria-label="Client gallery deliveries"
                                                >
                                                    {clientSuggestions.map((collection, index) => {
                                                        const isActive = index === activeClientSuggestionIndex;
                                                        return (
                                                            <button
                                                                key={collection.id}
                                                                type="button"
                                                                className={`sa-name-suggest-option${isActive ? ' sa-name-suggest-option--active' : ''}`}
                                                                role="option"
                                                                aria-selected={isActive}
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() =>
                                                                    handleSelectClientSuggestion(collection)
                                                                }
                                                            >
                                                                <span className="sa-name-suggest-title">
                                                                    {collection.name}
                                                                </span>
                                                                <span className="sa-name-suggest-meta">
                                                                    {formatSuggestionDate(collection.event_date)}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : null}
                                        </div>
                                            <p className="sa-field-help">
                                                Attaching a client now means the proofing link, comments and swap requests
                                                all land against the right person. You can add one later.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="sa-wizard-footer">
                                    <div className="sa-wizard-actions">
                                        <button
                                            type="submit"
                                            className="cc-submit-btn"
                                            disabled={!canContinue || isSubmitting}
                                        >
                                            Continue →
                                        </button>
                                        <button
                                            type="button"
                                            className="cc-cancel-btn"
                                            onClick={() => navigate('/album-proofer')}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {!canContinue ? (
                                        <p className="sa-wizard-hint">An album name is required.</p>
                                    ) : null}
                                </div>
                            </section>
                        ) : (
                            <section className="sa-wizard-card sa-wizard-card--step2">
                                <div className="sa-wizard-card-body">
                                <div className="sa-wizard-card-intro">
                                    <span className="sa-create-kicker">ALBUM PROOFER SETUP</span>
                                    <h2>Upload the spreads for {albumTitleLabel}.</h2>
                                    <p className="sa-wizard-card-lead">
                                        Each file becomes one spread, in the order shown below. Drag to reorder before
                                        you create — or after, in the editor.
                                    </p>
                                </div>

                                <div className="sa-wizard-step2-body">
                                    <div className="sa-wizard-cover-block">
                                        <div className="sa-wizard-section-head">
                                            <span>Album cover</span>
                                            <small>Optional</small>
                                        </div>

                                        {!coverPreview ? (
                                            <label
                                                className={`sa-upload-card sa-upload-card--cover${
                                                    coverDropActive ? ' sa-upload-card--drop-active' : ''
                                                }`}
                                                htmlFor="album-cover-image"
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    setCoverDropActive(true);
                                                }}
                                                onDragLeave={() => setCoverDropActive(false)}
                                                onDrop={handleCoverDrop}
                                            >
                                                <span className="sa-upload-icon" aria-hidden>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="17 8 12 3 7 8" />
                                                        <line x1="12" y1="3" x2="12" y2="15" />
                                                    </svg>
                                                </span>
                                                <div className="sa-upload-card-info">
                                                    <strong>Choose a cover image or PDF</strong>
                                                    <small>One wide file covering back, spine and front.</small>
                                                </div>
                                            </label>
                                        ) : (
                                            <div className="sa-cover-row">
                                                <div className="sa-cover-row-thumb">
                                                    {coverPreview.url ? (
                                                        <img src={coverPreview.url} alt="" />
                                                    ) : (
                                                        <span className="sa-cover-row-placeholder" />
                                                    )}
                                                </div>
                                                <div className="sa-cover-row-meta">
                                                    <strong title={coverPreview.name}>{coverPreview.name}</strong>
                                                    <span>
                                                        {formatUploadSize(coverPreview.size)}
                                                        {' · '}
                                                        {coverPreview.thumbReady
                                                            ? 'back, spine and front'
                                                            : 'processing…'}
                                                    </span>
                                                </div>
                                                <div className="sa-cover-row-actions">
                                                    <button
                                                        type="button"
                                                        className="sa-cover-action"
                                                        onClick={() => coverInputRef.current?.click()}
                                                    >
                                                        Replace
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="sa-cover-action"
                                                        onClick={handleRemoveCover}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="sa-wizard-spreads-block">
                                        <div className="sa-wizard-section-head">
                                            <span>Spreads</span>
                                            <small>
                                                {previewSlots.length > 0
                                                    ? `${previewSlots.length} selected`
                                                    : 'Required'}
                                            </small>
                                        </div>

                                        {previewSlots.length === 0 ? (
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
                                                <span className="sa-upload-icon" aria-hidden>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="17 8 12 3 7 8" />
                                                        <line x1="12" y1="3" x2="12" y2="15" />
                                                    </svg>
                                                </span>
                                                <div className="sa-upload-card-info">
                                                    <strong>Choose photos or a PDF</strong>
                                                    <small>
                                                        JPG, PNG, WEBP or PDF — a multi-page PDF becomes one spread
                                                        per page.
                                                    </small>
                                                </div>
                                            </label>
                                        ) : (
                                            <div className="sa-spreads-panel">
                                                <label
                                                    className="sa-upload-card sa-upload-card--add-more"
                                                    htmlFor="album-photos"
                                                >
                                                    <span className="sa-upload-icon" aria-hidden>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                            <polyline points="17 8 12 3 7 8" />
                                                            <line x1="12" y1="3" x2="12" y2="15" />
                                                        </svg>
                                                    </span>
                                                    <div className="sa-upload-card-info">
                                                        <strong>Add more spreads</strong>
                                                        <small>
                                                            JPG, PNG, WEBP or PDF — a multi-page PDF becomes one
                                                            spread per page.
                                                        </small>
                                                    </div>
                                                </label>

                                                <div className="sa-spreads-order-bar">
                                                    <span className="sa-spreads-order-label">Order by</span>
                                                    <button
                                                        type="button"
                                                        className={`sa-spreads-order-btn${
                                                            spreadOrderMode === 'filename'
                                                                ? ' sa-spreads-order-btn--active'
                                                                : ''
                                                        }`}
                                                        onClick={() => setSpreadOrderMode('filename')}
                                                    >
                                                        File name
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`sa-spreads-order-btn${
                                                            spreadOrderMode === 'selected'
                                                                ? ' sa-spreads-order-btn--active'
                                                                : ''
                                                        }`}
                                                        onClick={() => setSpreadOrderMode('selected')}
                                                    >
                                                        As selected
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="sa-upload-clear"
                                                        onClick={() => setPhotoFiles([])}
                                                        disabled={analyzingUploads}
                                                    >
                                                        Clear all
                                                    </button>
                                                </div>

                                                <div
                                                    className={`sa-spread-grid${
                                                        analyzingUploads ? ' sa-spread-grid--analyzing' : ''
                                                    }`}
                                                >
                                                    {orderedPreviewSlots.map((preview) => {
                                                        const slotIndex = previewSlots.indexOf(preview);
                                                        return (
                                                            <div
                                                                key={preview.id || slotIndex}
                                                                className={`sa-spread-grid-tile${
                                                                    dragOverIndex === slotIndex
                                                                        ? ' sa-spread-grid-tile--drag-over'
                                                                        : ''
                                                                }`}
                                                                draggable={spreadOrderMode === 'selected'}
                                                                onDragStart={() => {
                                                                    dragFromIndexRef.current = slotIndex;
                                                                }}
                                                                onDragOver={(e) => {
                                                                    e.preventDefault();
                                                                    setDragOverIndex(slotIndex);
                                                                }}
                                                                onDrop={(e) => {
                                                                    e.preventDefault();
                                                                    handlePreviewDrop(slotIndex);
                                                                    setSpreadOrderMode('selected');
                                                                }}
                                                                onDragEnd={handlePreviewDragEnd}
                                                            >
                                                                <span className="sa-spread-grid-num">
                                                                    {String(
                                                                        orderedPreviewSlots.indexOf(preview) + 1
                                                                    ).padStart(2, '0')}
                                                                </span>
                                                                {preview.url ? (
                                                                    <img src={preview.url} alt="" draggable={false} />
                                                                ) : (
                                                                    <span className="sa-spread-grid-ph" />
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="sa-spread-grid-remove"
                                                                    onClick={() => handleRemovePreview(preview)}
                                                                    aria-label={`Remove spread ${slotIndex + 1}`}
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <p className="sa-spreads-footnote">
                                                    Creates <strong>{previewSlots.length}</strong> spread
                                                    {previewSlots.length === 1 ? '' : 's'}
                                                    {hasCoverImage ? ' and a cover' : ''}. The first and last spreads
                                                    stay fixed once the album is created — everything between them can
                                                    be reordered at any time.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

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
                                                                (createProgress.current / createProgress.total) * 100
                                                            )
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                </div>

                                <div className="sa-wizard-footer">
                                    <div className="sa-wizard-actions">
                                        <button
                                            type="submit"
                                            className="cc-submit-btn"
                                            disabled={!canCreate}
                                        >
                                            {isSubmitting ? 'Creating…' : 'Create album'}
                                        </button>
                                        <button
                                            type="button"
                                            className="cc-cancel-btn"
                                            onClick={handleBackToDetails}
                                            disabled={isSubmitting}
                                        >
                                            Back
                                        </button>
                                    </div>
                                    {!canCreate && !isSubmitting ? (
                                        <p className="sa-wizard-hint">Add at least one spread.</p>
                                    ) : null}
                                </div>
                            </section>
                        )}
                    </form>
                </div>
            </main>
        </div>
            <AppToast toast={toast} onDismiss={clearToast} />
        </>
    );
};

export default CreateAlbum;
