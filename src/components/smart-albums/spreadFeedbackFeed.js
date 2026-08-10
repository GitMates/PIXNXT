export function feedItemSortTime(iso) {
    const t = new Date(iso || 0).getTime();
    return Number.isFinite(t) ? t : 0;
}

/** One feed card per version upload or restore, ordered by time. */
function imageReplacementsForFeed(imageReplacements = []) {
    if (!imageReplacements?.length) return [];

    const sorted = [...imageReplacements].sort(
        (a, b) => feedItemSortTime(a.createdAt) - feedItemSortTime(b.createdAt)
    );
    const latestBySpread = new Map();
    for (const row of sorted) {
        const spreadIndex = row.spreadIndex ?? 0;
        latestBySpread.set(spreadIndex, row);
    }

    return sorted.map((replacement) => ({
        kind: 'image-replacement',
        id: `repl-${replacement.id}`,
        sortAt: feedItemSortTime(replacement.createdAt),
        spreadIndex: replacement.spreadIndex ?? 0,
        replacement,
        isLatestOnSpread:
            latestBySpread.get(replacement.spreadIndex ?? 0)?.id === replacement.id,
    }));
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

    items.push(...imageReplacementsForFeed(imageReplacements));

    return items.sort((a, b) => a.sortAt - b.sortAt);
}
