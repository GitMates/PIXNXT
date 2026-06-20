export function feedItemSortTime(iso) {
    const t = new Date(iso || 0).getTime();
    return Number.isFinite(t) ? t : 0;
}

/** Merge spread feedback items; oldest first, newest at bottom. */
export function buildSpreadFeedbackFeed({
    photographerMessages = [],
    photoPins = [],
    swapMarks = [],
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

    return items.sort((a, b) => a.sortAt - b.sortAt);
}
