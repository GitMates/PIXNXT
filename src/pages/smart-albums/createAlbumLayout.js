import { MIN_ALBUM_PAGES, MAX_ALBUM_PAGES } from '../../components/smart-albums/albumPageStorage';
import { getTotalSpreads } from '../../components/smart-albums/albumSpreadUtils';
import { isImageFile, isPdfFile } from '../../lib/pdfToImages';
import * as pdfjs from 'pdfjs-dist';

const MAX_PDF_PAGES = 40;

let pdfWorkerReady = false;

function ensurePdfWorker() {
    if (pdfWorkerReady) return;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();
    pdfWorkerReady = true;
}

/** Count photos after expanding PDFs (matches upload placement). */
export async function countExpandedUploadPhotos(files) {
    if (!files?.length) return 0;
    ensurePdfWorker();

    let total = 0;
    for (const file of files) {
        if (isImageFile(file)) {
            total += 1;
            continue;
        }
        if (isPdfFile(file)) {
            try {
                const data = await file.arrayBuffer();
                const pdf = await pdfjs.getDocument({ data }).promise;
                total += Math.min(pdf.numPages, MAX_PDF_PAGES);
            } catch (e) {
                console.warn('Could not read PDF page count', file.name, e);
            }
        }
    }
    return total;
}

function isWholeSpreadLayout(gridLayout) {
    return gridLayout === 'whole-spread' || String(gridLayout || '').startsWith('whole-spread');
}

/**
 * Page count from photo count. With covers: reserves front cover + end spread.
 */
export function computePageCountFromPhotoCount(
    photoCount,
    { includeCovers = true, gridLayout = 'two-page' } = {}
) {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    const whole = isWholeSpreadLayout(gridLayout);

    if (n === 0) {
        return includeCovers ? MIN_ALBUM_PAGES : 2;
    }

    let pages;
    if (includeCovers) {
        if (whole) {
            // One spread per photo: front cover, inner spreads, end cover.
            pages = Math.max(MIN_ALBUM_PAGES, 2 * n);
        } else if (n === 1) {
            pages = 2;
        } else {
            // Front cover spread (2) + inner balance (n−2 photos) + end cover spread (2).
            const innerCount = Math.max(0, n - 2);
            const innerSpreadPages = 2 * Math.ceil(innerCount / 2);
            pages = Math.max(MIN_ALBUM_PAGES, 4 + innerSpreadPages);
        }
    } else if (whole) {
        pages = Math.max(2, n * 2);
    } else {
        pages = Math.max(1, n);
    }

    return Math.min(MAX_ALBUM_PAGES, pages);
}

export function describeAlbumLayout(
    photoCount,
    pageCount,
    { includeCovers = true, gridLayout = 'two-page' } = {}
) {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    const pages = Math.max(1, Math.floor(Number(pageCount) || MIN_ALBUM_PAGES));
    const showCover = includeCovers;
    const totalSpreads = getTotalSpreads(pages, { showCover });
    const whole = isWholeSpreadLayout(gridLayout);

    if (n === 0) {
        return {
            photoCount: 0,
            pageCount: pages,
            totalSpreads,
            headline: 'Upload photos to set album size',
            detail: `Empty albums start at ${MIN_ALBUM_PAGES} pages. Size updates when you add files.`,
        };
    }

    if (includeCovers) {
        const innerSpreads = Math.max(0, totalSpreads - 2);
        return {
            photoCount: n,
            pageCount: pages,
            totalSpreads,
            headline: `${n} photo${n === 1 ? '' : 's'} → ${pages} pages`,
            detail: `Front cover (blank left) · ${innerSpreads} inner spread${innerSpreads === 1 ? '' : 's'} · End cover (blank right)${
                whole ? ' · whole-spread layout' : ''
            }`,
        };
    }

    return {
        photoCount: n,
        pageCount: pages,
        totalSpreads,
        headline: `${n} photo${n === 1 ? '' : 's'} → ${pages} pages`,
        detail: `${totalSpreads} spread${totalSpreads === 1 ? '' : 's'}, no dedicated covers${
            whole ? ' · whole-spread layout' : ''
        }`,
    };
}
