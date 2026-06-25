import { moveItemInOrder } from '../../lib/uploadFileOrder';
import { getSpreadLeftPageIndex } from './albumSpreadGrid';
import {
    getDraggableOverviewSpreadIndices,
    getSpreadPages,
    pageToSpreadIndex,
} from './albumSpreadUtils';
import { reorderImageReplacementsForOverview } from './albumImageReplacements';
import { reorderPhotoPinsForOverview } from './albumPhotoPins';
import { reorderSwapMarksForOverview } from './albumSwapMarks';
import { reorderLocalSpreadCommentsForOverview } from '../../services/smartAlbumComments.service';

/** After overview drag-reorder: map a spread index to where its metadata should live. */
export function remapSpreadIndexAfterOverviewReorder(spreadIndex, draggable, newOrder) {
    const idx = Number(spreadIndex);
    if (!Number.isFinite(idx) || !draggable.includes(idx)) return spreadIndex;
    const destPos = newOrder.indexOf(idx);
    if (destPos < 0) return spreadIndex;
    return draggable[destPos];
}

export function remapPageForSpreadMove(pageNum, oldSpreadIndex, newSpreadIndex, totalPages, spreadOpts) {
    const page = Number(pageNum);
    if (!Number.isFinite(page)) return pageNum;
    const oldPages = getSpreadPages(oldSpreadIndex, totalPages, spreadOpts);
    const newPages = getSpreadPages(newSpreadIndex, totalPages, spreadOpts);
    if (page < oldPages.left || page > oldPages.right) return pageNum;
    return newPages.left + (page - oldPages.left);
}

export function buildOverviewSpreadReorderPlan(fromSpreadIndex, toSpreadIndex, totalPages, spreadOpts) {
    if (fromSpreadIndex === toSpreadIndex) return null;
    const draggable = getDraggableOverviewSpreadIndices(totalPages, spreadOpts);
    const fromPos = draggable.indexOf(fromSpreadIndex);
    const toPos = draggable.indexOf(toSpreadIndex);
    if (fromPos < 0 || toPos < 0) return null;
    return {
        draggable,
        newOrder: moveItemInOrder(draggable, fromPos, toPos),
    };
}

/** Move comments, swaps, pins, and image-version history with reordered spread content. */
export function reorderOverviewSpreadMetadata(
    albumId,
    fromSpreadIndex,
    toSpreadIndex,
    { totalPages, spreadOpts } = {}
) {
    const plan = buildOverviewSpreadReorderPlan(
        fromSpreadIndex,
        toSpreadIndex,
        totalPages,
        spreadOpts
    );
    if (!plan) return false;

    const { draggable, newOrder } = plan;

    reorderLocalSpreadCommentsForOverview(albumId, draggable, newOrder);
    reorderImageReplacementsForOverview(albumId, draggable, newOrder, totalPages, spreadOpts);
    reorderSwapMarksForOverview(albumId, draggable, newOrder, totalPages, spreadOpts);
    reorderPhotoPinsForOverview(albumId, draggable, newOrder, totalPages, spreadOpts);
    return true;
}

export function spreadIndexForPageNum(pageNum, totalPages, spreadOpts) {
    const spreadCtx = { ...spreadOpts, totalPages };
    const left = getSpreadLeftPageIndex(pageNum, spreadCtx);
    return pageToSpreadIndex(left, spreadCtx);
}
