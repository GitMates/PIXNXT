import { isImageFile, isPdfFile, MAX_PDF_PAGES } from '../../lib/pdfToImages';

export { MAX_PDF_PAGES };

const THUMB_MAX_EDGE = 240;
const THUMB_JPEG_QUALITY = 0.72;
const THUMB_BUILD_CONCURRENCY = 3;

async function getPdfjs() {
    const pdfjs = await import('pdfjs-dist');
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
        ).toString();
    }
    return pdfjs;
}
async function runWithConcurrency(items, concurrency, worker) {
    if (!items.length) return;
    let nextIndex = 0;
    async function runWorker() {
        while (nextIndex < items.length) {
            const index = nextIndex;
            nextIndex += 1;
            await worker(items[index], index);
        }
    }
    const workers = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: workers }, () => runWorker()));
}

function drawBitmapToThumbUrl(bitmap) {
    const scale = Math.min(THUMB_MAX_EDGE / bitmap.width, THUMB_MAX_EDGE / bitmap.height, 1);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close?.();
        return null;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    return canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY);
}

/** Small JPEG data URL for grid previews — avoids decoding multi‑MB originals while scrolling. */
export async function createImagePreviewThumbUrl(file) {
    if (!file?.type?.startsWith('image/')) return null;

    if (typeof createImageBitmap === 'function') {
        try {
            const bitmap = await createImageBitmap(file);
            return drawBitmapToThumbUrl(bitmap);
        } catch {
            /* fall through */
        }
    }

    return new Promise((resolve) => {
        const blobUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(blobUrl);
            const scale = Math.min(
                THUMB_MAX_EDGE / img.naturalWidth,
                THUMB_MAX_EDGE / img.naturalHeight,
                1
            );
            const width = Math.max(1, Math.round(img.naturalWidth * scale));
            const height = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(null);
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY));
        };
        img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            resolve(null);
        };
        img.src = blobUrl;
    });
}

/** Number of pages in a PDF (capped at MAX_PDF_PAGES). */
export async function getPdfPageCount(file) {
    if (!isPdfFile(file)) return 0;
    try {
        const pdfjs = await getPdfjs();
        const data = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        return Math.min(pdf.numPages, MAX_PDF_PAGES);
    } catch (e) {
        console.warn('Could not read PDF page count', file?.name, e);
        return 0;
    }
}

/** One PDF page as a small JPEG preview (pageNumber is 1-based). */
export async function createPdfPagePreviewThumbUrl(file, pageNumber) {
    if (!isPdfFile(file) || pageNumber < 1) return null;

    try {
        const pdfjs = await getPdfjs();
        const data = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data }).promise;
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale =
            (Math.min(
                THUMB_MAX_EDGE / baseViewport.width,
                THUMB_MAX_EDGE / baseViewport.height
            ) || 1) * 1.25;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        await page.render({ canvasContext: ctx, viewport }).promise;
        return canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY);
    } catch (e) {
        console.warn('Could not render PDF preview', file?.name, e);
        return null;
    }
}

/** @deprecated Use createPdfPagePreviewThumbUrl(file, 1) */
export async function createPdfPreviewThumbUrl(file) {
    return createPdfPagePreviewThumbUrl(file, 1);
}

async function createPreviewThumbUrl(file) {
    if (isImageFile(file)) return createImagePreviewThumbUrl(file);
    if (isPdfFile(file)) return createPdfPagePreviewThumbUrl(file, 1);
    return null;
}

/**
 * Map collection items (upload order) to preview slot display order.
 * `slots` is the user-ordered flat list (images + PDF pages).
 */
export function collectionItemIdsForPreviewSlots(photoFiles, addedItems, slots) {
    if (!slots?.length || !addedItems?.length) return [];

    let cursor = 0;
    const fileRanges = (photoFiles || []).map((file, fileIndex) => {
        const start = cursor;
        let count = 1;
        if (isPdfFile(file)) {
            const fileSlots = slots.filter((s) => s.fileIndex === fileIndex);
            count = fileSlots.length
                ? Math.max(...fileSlots.map((s) => (s.pageIndex ?? 0) + 1))
                : 0;
        }
        cursor += count;
        return { start, count };
    });

    return slots
        .map((slot) => {
            const range = fileRanges[slot.fileIndex];
            if (!range) return null;
            const pageIdx = slot.pageIndex ?? 0;
            return addedItems[range.start + pageIdx]?.id ?? null;
        })
        .filter(Boolean);
}

/**
 * Build lightweight preview URLs for each image/PDF file.
 * Calls onThumb(index, url) as each thumb is ready; batches via requestAnimationFrame.
 */
export async function buildPreviewThumbUrls(files, { onThumb, signal } = {}) {
    const fileIndices = [];
    files.forEach((file, index) => {
        if (isImageFile(file) || isPdfFile(file)) fileIndices.push(index);
    });

    const pending = [];
    let rafId = null;

    const flush = () => {
        rafId = null;
        if (signal?.aborted || !pending.length) {
            pending.length = 0;
            return;
        }
        const batch = pending.splice(0, pending.length);
        for (const { index, url } of batch) {
            onThumb(index, url);
        }
    };

    const queueThumb = (index, url) => {
        if (signal?.aborted) return;
        pending.push({ index, url });
        if (rafId == null) {
            rafId = requestAnimationFrame(flush);
        }
    };

    await runWithConcurrency(fileIndices, THUMB_BUILD_CONCURRENCY, async (fileIndex) => {
        if (signal?.aborted) return;
        let url = null;
        try {
            url = await createPreviewThumbUrl(files[fileIndex]);
        } catch {
            url = null;
        }
        if (!signal?.aborted) queueThumb(fileIndex, url);
    });

    if (!signal?.aborted && pending.length) {
        flush();
    }
}
