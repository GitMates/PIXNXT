/** D1 stores delivery/photo stars as 0/1; some clients send real booleans. */
export function isStarredFlag(value) {
  return value === true || value === 1 || value === '1';
}

/** Persist as 0/1 so card, menu, board cache, and the Starred page agree. */
export function starredWriteValue(next) {
  return next ? 1 : 0;
}

export function filterStarredCollections(collections) {
  return (collections || []).filter((collection) => isStarredFlag(collection?.is_starred));
}

/**
 * Starred list: board cache is the latest studio action; API can lag.
 * Keep board-starred rows even if the API has not caught up, and hide
 * rows the board already unstarred even if the API still returns them.
 */
export function mergeStarredBoardAndApi(boardCollections, apiStarredRows) {
  const board = boardCollections || [];
  const apiRows = apiStarredRows || [];
  const boardById = new Map(board.map((row) => [row.id, row]));
  const apiById = new Map(apiRows.map((row) => [row.id, row]));

  const ids = new Set();
  for (const row of board) {
    if (row?.id && isStarredFlag(row.is_starred)) ids.add(row.id);
  }
  for (const row of apiRows) {
    if (!row?.id) continue;
    const boardRow = boardById.get(row.id);
    if (boardRow && !isStarredFlag(boardRow.is_starred)) continue;
    ids.add(row.id);
  }

  const merged = [];
  for (const id of ids) {
    const boardRow = boardById.get(id);
    const apiRow = apiById.get(id);
    const row = boardRow && apiRow ? { ...apiRow, ...boardRow } : boardRow || apiRow;
    if (row && isStarredFlag(row.is_starred)) merged.push(row);
  }
  return merged;
}
