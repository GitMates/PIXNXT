import React, { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '../../components/ui/DatePicker';
import { addFilesToAlbumCollection } from '../../components/smart-albums/albumCollection';
import { applyCollectionOrderToPages } from '../../components/smart-albums/albumPagePhotos';
import { useAuth } from '../../hooks/useAuth';
import { galleryService } from '../../services/gallery.service';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    blankCoverSpreadGridSize,
    detectGridSizesFromFiles,
    formatGridSizeLabelForLayout,
    gridSizeFromDimensions,
    loadImageDimensionsFromFile,
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
import {
    collectionMatchesGallerySearch,
    normalizeGallerySearchQuery,
} from '../../utils/filterClientGallerySearch';
import './CreateAlbum.css';

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

async function detectCreateAlbumGridSizes(coverFile, photoFiles, gridLayout) {
    if (coverFile) {
        let spreadGridSize = null;
        if (isImageFile(coverFile)) {
            try {
                const dims = await loadImageDimensionsFromFile(coverFile);
                spreadGridSize = gridSizeFromDimensions(dims.width, dims.height, {
                    wholeSpread: false,
                });
            } catch {
                spreadGridSize = null;
            }
        } else if (isPdfFile(coverFile)) {
            const coverGrid = await detectGridSizesFromFiles([coverFile], { gridLayout }).catch(
                () => ({ pageGridSize: 'square', spreadGridSize: null })
            );
            spreadGridSize = coverGrid.pageGridSize;
        }

        const innerGrid = photoFiles.length
            ? await detectGridSizesFromFiles(photoFiles, {
                  gridLayout,
                  hasCovers: true,
                  blankCovers: true,
              }).catch(() => ({ pageGridSize: 'square', spreadGridSize: null }))
            : { pageGridSize: 'square', spreadGridSize: null };

        return {
            pageGridSize: innerGrid.pageGridSize,
            spreadGridSize:
                spreadGridSize ?? blankCoverSpreadGridSize(innerGrid.pageGridSize),
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
    const [galleryCollections, setGalleryCollections] = useState([]);
    const [nameSuggestOpen, setNameSuggestOpen] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
    const nameAutocompleteRef = useRef(null);
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
    const [expandedPhotoCount, setExpandedPhotoCount] = useState(0);
    const [photoCountBusy, setPhotoCountBusy] = useState(false);
    const [gridSizeBusy, setGridSizeBusy] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createProgress, setCreateProgress] = useState(null);
    const [error, setError] = useState(null);

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
        galleryService
            .getCollections(user.id)
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
                setActiveSuggestionIndex(-1);
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
        setActiveSuggestionIndex(-1);
    }, []);

    const handleSelectCollectionSuggestion = useCallback((collection) => {
        setName(collection?.name || '');
        setDate(collectionEventDateValue(collection?.event_date));
        setNameSuggestOpen(false);
        setActiveSuggestionIndex(-1);
    }, []);

    const handleNameKeyDown = useCallback(
        (e) => {
            if (!showNameSuggestions) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIndex((prev) =>
                    prev < nameSuggestions.length - 1 ? prev + 1 : 0
                );
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIndex((prev) =>
                    prev > 0 ? prev - 1 : nameSuggestions.length - 1
                );
                return;
            }

            if (e.key === 'Enter' && activeSuggestionIndex >= 0) {
                e.preventDefault();
                const selected = nameSuggestions[activeSuggestionIndex];
                if (selected) handleSelectCollectionSuggestion(selected);
                return;
            }

            if (e.key === 'Escape') {
                setNameSuggestOpen(false);
                setActiveSuggestionIndex(-1);
            }
        },
        [
            showNameSuggestions,
            nameSuggestions,
            activeSuggestionIndex,
            handleSelectCollectionSuggestion,
        ]
    );

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
    const animatePreviewCards = previewSlots.length <= 12;

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

            const album = await smartAlbumsService.createAlbum({
                photographer_id: user.id,
                name,
                event_date: date || null,
                page_count: finalPageCount,
                grid_size: finalGridSize,
                spread_grid_size: finalSpreadGridSize,
                grid_layout: finalGridLayout,
                has_covers: includeCoverSpreads,
                blank_covers: blankCovers,
            });

            if (coverFile || photoFiles.length > 0) {
                if (coverFile) {
                    setProgress({
                        label: 'Uploading cover image…',
                        detail: 'Saving book wrap to your album.',
                        current: 0,
                        total: 1,
                    });
                    await addFilesToAlbumCollection(album.id, [coverFile], {
                        photographerId: user.id,
                        skipDuplicateCheck: true,
                        coverWrap: true,
                    });
                }

                let added = [];
                if (photoFiles.length > 0) {
                    added = await addFilesToAlbumCollection(album.id, photoFiles, {
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
                    previewSlots
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
                        user.id,
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
                            Upload an optional cover image and inner-page photos. Layout is set once
                            at creation — photos are placed automatically after the album is created.
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
                                <div
                                    className={`sa-name-autocomplete${
                                        showNameSuggestions ? ' sa-name-autocomplete--open' : ''
                                    }`}
                                    ref={nameAutocompleteRef}
                                >
                                    <input
                                        id="album-name"
                                        type="text"
                                        className="cc-input"
                                        placeholder="e.g. Wedding of Sarah & James"
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
                                            aria-label="Client gallery collections"
                                        >
                                            {nameSuggestions.map((collection, index) => {
                                                const isActive = index === activeSuggestionIndex;
                                                return (
                                                    <button
                                                        key={collection.id}
                                                        type="button"
                                                        className={`sa-name-suggest-option${
                                                            isActive
                                                                ? ' sa-name-suggest-option--active'
                                                                : ''
                                                        }`}
                                                        role="option"
                                                        aria-selected={isActive}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() =>
                                                            handleSelectCollectionSuggestion(
                                                                collection
                                                            )
                                                        }
                                                    >
                                                        <span className="sa-name-suggest-title">
                                                            {collection.name}
                                                        </span>
                                                        <span className="sa-name-suggest-meta">
                                                            {formatSuggestionDate(
                                                                collection.event_date
                                                            )}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                                <p className="sa-field-note">
                                    Start typing to match a client gallery collection name or photo
                                    filename — selecting one fills the event date too.
                                </p>
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label">Event Date</label>
                                <DatePicker value={date} onChange={setDate} placeholder="Select event date" />
                            </div>
                        </section>

                        <section className="sa-create-card">
                            <div className="sa-section-heading">
                                <span>Upload Cover image</span>
                            </div>

                            <div className="cc-form-group">
                                <label className="cc-label" htmlFor="album-cover-image">
                                    Cover image
                                </label>
                                <input
                                    id="album-cover-image"
                                    type="file"
                                    className="sa-file-input-native"
                                    accept="image/*,application/pdf,.pdf"
                                    onChange={handleCoverChange}
                                />
                                {!coverPreview ? (
                                    <>
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
                                            <span className="sa-upload-icon">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="17 8 12 3 7 8" />
                                                    <line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                            </span>
                                            <strong>Choose cover image or PDF</strong>
                                            <small>
                                                One wide image for back, spine, and front · optional
                                            </small>
                                        </label>
                                        <p className="sa-field-note">
                                            Leave empty for blank covers. Inner page photos are added
                                            below.
                                        </p>
                                    </>
                                ) : (
                                    <div className="sa-cover-upload-preview">
                                        <UploadPreviewCard
                                            preview={{ ...coverPreview, index: 0, fileIndex: 0 }}
                                            index={0}
                                            onRemove={() => handleRemoveCover()}
                                            animateIn={false}
                                            roleLabel="Book wrap"
                                        />
                                        <button
                                            type="button"
                                            className="sa-upload-clear"
                                            onClick={handleRemoveCover}
                                        >
                                            Remove cover
                                        </button>
                                    </div>
                                )}
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
