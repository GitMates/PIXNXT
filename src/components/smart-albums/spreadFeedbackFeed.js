import { sortSpreadReplacements } from './albumImageReplacements';

export function feedItemSortTime(iso) {
    const t = new Date(iso || 0).getTime();
    return Number.isFinite(t) ? t : 0;
}

function groupImageReplacementsForFeed(imageReplacements = []) {
    const bySpread = new Map();
    for (const replacement of imageReplacements) {
        const spreadIndex = replacement.spreadIndex ?? 0;
        if (!bySpread.has(spreadIndex)) bySpread.set(spreadIndex, []);
        bySpread.get(spreadIndex).push(replacement);
    }

    const items = [];
    for (const [spreadIndex, rows] of bySpread) {
        if (!rows.length) continue;
        const sorted = sortSpreadReplacements(rows);
        const latest = sorted[sorted.length - 1];
        items.push({
            kind: 'image-replacement-stack',
            id: `repl-stack-${spreadIndex}-${latest.id}`,
            sortAt: feedItemSortTime(latest.createdAt),
            spreadIndex,
            replacements: sorted,
        });
    }
    return items;
}

/** Merge spread feedback items; oldest first, newest at bottom. */
export function buildSpreadFeedbackFeed({
    photographerMessages = [],
    clientMessages = [],
    photoPins = [],
    swapMarks = [],
    imageReplacements = [],
    includeSwaps = true,
}) {
    const items = [];

    photographerMessages.forEach((comment) => {
        items.push({
            kind: 'photographer-message',
            id: `msg-${comment.id}`,
            sortAt: feedItemSortTime(comment.updated_at || comment.created_at),
            comment,
        });
    });

    clientMessages.forEach((comment) => {
        items.push({
            kind: 'client-message',
            id: `client-msg-${comment.id}`,
            sortAt: feedItemSortTime(comment.updated_at || comment.created_at),
            comment,
        });
    });

    photoPins.forEach((pin) => {
        items.push({
            kind: 'photo-pin',
            id: `pin-${pin.id}`,
            sortAt: feedItemSortTime(pin.createdAt),
            pin,
        });
    });

    if (includeSwaps) {
        swapMarks.forEach((mark) => {
            items.push({
                kind: 'swap',
                id: `swap-${mark.id}`,
                sortAt: feedItemSortTime(mark.createdAt),
                mark,
            });
        });
    }

    items.push(...groupImageReplacementsForFeed(imageReplacements));

    return items.sort((a, b) => a.sortAt - b.sortAt);
}
