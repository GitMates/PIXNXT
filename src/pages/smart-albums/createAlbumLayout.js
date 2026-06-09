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
 * Page count from photo count. With covers: front wrap spread + inner + back wrap spread.
 */
export function computePageCountFromPhotoCount(
    photoCount,
    { includeCovers = true, blankCovers = false, gridLayout = 'two-page' } = {}
) {
    const n = Math.max(0, Math.floor(Number(photoCount) || 0));
    const whole = isWholeSpreadLayout(gridLayout);

    if (n === 0) {
        return includeCovers ? MIN_ALBUM_PAGES : 2;
    }

    let pages;
    if (includeCovers) {
        if (blankCovers) {
            if (whole) {
                pages = Math.max(MIN_ALBUM_PAGES, 2 + 2 * n + 2);
            } else if (n <= 1) {
                pages = 6;
            } else {
                pages = Math.max(MIN_ALBUM_PAGES, n + 6);
            }
        } else if (whole) {
            // Front (2) + inner spreads (n−1 photos) + back (2).
            pages = Math.max(MIN_ALBUM_PAGES, 2 * n + 2);
        } else if (n === 1) {
            pages = 4;
        } else if (n === 2) {
            pages = 6;
        } else {
            // Front (2) + inside half (2) + middle (n−3) + pre-back (2) + back (2).
            pages = Math.max(MIN_ALBUM_PAGES, n + 5);
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
    { includeCovers = true, blankCovers = false, gridLayout = 'two-page' } = {}
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
        if (blankCovers) {
            return {
                photoCount: n,
                pageCount: pages,
                totalSpreads,
                headline: `${n} photo${n === 1 ? '' : 's'} → ${pages} pages`,
                detail: `Blank front & back covers · ${innerSpreads} inner spread${
                    innerSpreads === 1 ? '' : 's'
                } · all photos fill inner pages${whole ? ' · whole-spread layout' : ''}`,
            };
        }
        return {
            photoCount: n,
            pageCount: pages,
            totalSpreads,
            headline: `${n} photo${n === 1 ? '' : 's'} → ${pages} pages`,
            detail: `Book wrap (front right + back left) · ${innerSpreads} inner spread${innerSpreads === 1 ? '' : 's'}${
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
