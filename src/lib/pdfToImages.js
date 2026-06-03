import * as pdfjs from 'pdfjs-dist';

let workerReady = false;

function ensurePdfWorker() {
    if (workerReady) return;
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();
    workerReady = true;
}

const MAX_CANVAS_EDGE = 2000;
const JPEG_QUALITY = 0.88;
const MAX_PDF_PAGES = 40;
const RENDER_SCALE = 1.5;

export function isPdfFile(file) {
    if (!file) return false;
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    return type === 'application/pdf' || name.endsWith('.pdf');
}

export function isImageFile(file) {
    return Boolean(file?.type?.startsWith('image/'));
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function renderPageToDataUrl(page) {
    const baseViewport = page.getViewport({ scale: RENDER_SCALE });
    const edge = Math.max(baseViewport.width, baseViewport.height);
    const scale =
        edge > MAX_CANVAS_EDGE ? (RENDER_SCALE * MAX_CANVAS_EDGE) / edge : RENDER_SCALE;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

/**
 * Render each PDF page to a JPEG data URL (for album collection / grid placement).
 */
export async function pdfFileToImageDataUrls(file, { maxPages = MAX_PDF_PAGES } = {}) {
    ensurePdfWorker();
    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pageCount = Math.min(pdf.numPages, maxPages);
    const baseName = (file.name || 'document.pdf').replace(/\.pdf$/i, '');
    const urls = [];

    for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const dataUrl = await renderPageToDataUrl(page);
        urls.push({
            name: pageCount > 1 ? `${baseName} · page ${i}` : `${baseName}.pdf`,
            dataUrl,
        });
    }

    if (pdf.numPages > maxPages) {
        console.warn(
            `PDF "${file.name}" has ${pdf.numPages} pages; only the first ${maxPages} were imported.`
        );
    }

    return urls;
}

/**
 * Turn uploaded Files into { name, dataUrl }[] — images as-is, PDFs as one image per page.
 */
export async function expandUploadFilesToImages(files) {
    const batches = await Promise.all(
        (files || []).map(async (file) => {
            try {
                if (isImageFile(file)) {
                    return [
                        {
                            name: file.name || 'Photo',
                            dataUrl: await readFileAsDataUrl(file),
                        },
                    ];
                }
                if (isPdfFile(file)) {
                    return pdfFileToImageDataUrls(file);
                }
                return [];
            } catch (e) {
                console.warn('Could not import file', file.name, e);
                return [];
            }
        })
    );
    return batches.flat();
}
