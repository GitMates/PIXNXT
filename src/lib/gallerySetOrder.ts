export type GallerySetLike = {
  id: string;
  name?: string | null;
};

export type GallerySetTabItem = {
  id: string | null;
  name: string;
  isHighlights?: boolean;
};

/**
 * Order gallery set tabs using the dashboard sidebar order (includes virtual "highlights").
 * When no custom order is saved, Highlights stays first for backward compatibility.
 */
export function orderGallerySetTabs(options: {
  sets?: GallerySetLike[] | null;
  sidebarSetOrder?: string[] | null;
  showHighlights?: boolean;
  highlightsName?: string;
}): GallerySetTabItem[] {
  const {
    sets = [],
    sidebarSetOrder = null,
    showHighlights = true,
    highlightsName = 'Highlights',
  } = options;

  const setItems: GallerySetTabItem[] = (sets || [])
    .filter((s) => s?.id && String(s.name || '').toLowerCase() !== 'highlights')
    .map((s) => ({ id: s.id, name: s.name || 'Set' }));

  const highlightsTab: GallerySetTabItem | null = showHighlights
    ? { id: null, name: highlightsName || 'Highlights', isHighlights: true }
    : null;

  if (!sidebarSetOrder || sidebarSetOrder.length === 0) {
    return highlightsTab ? [highlightsTab, ...setItems] : setItems;
  }

  const map = new Map(setItems.map((item) => [item.id as string, item]));
  const ordered: GallerySetTabItem[] = [];
  let highlightsPlaced = false;

  for (const rawId of sidebarSetOrder) {
    const id = String(rawId);
    if (id === 'highlights') {
      if (highlightsTab) {
        ordered.push(highlightsTab);
        highlightsPlaced = true;
      }
      continue;
    }
    const item = map.get(id);
    if (item) {
      ordered.push(item);
      map.delete(id);
    }
  }

  map.forEach((item) => ordered.push(item));

  if (highlightsTab && !highlightsPlaced) {
    ordered.push(highlightsTab);
  }

  return ordered;
}
