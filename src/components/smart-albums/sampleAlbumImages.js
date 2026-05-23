/** Demo photos for Smart Album spreads until real uploads are wired up. */
const SAMPLE_COUNT = 12;

export function getSampleImageForPage(pageNum) {
    if (pageNum <= 0) return null;
    const seed = (pageNum - 1) % SAMPLE_COUNT;
    return `https://picsum.photos/seed/pixnxt-album-${seed}/1200/900`;
}
