import { describe, expect, it } from 'vitest';
import {
  filterStarredCollections,
  isStarredFlag,
  mergeStarredBoardAndApi,
  starredWriteValue,
} from './starredFlag';

describe('isStarredFlag', () => {
  it('treats true, 1, and "1" as starred', () => {
    expect(isStarredFlag(true)).toBe(true);
    expect(isStarredFlag(1)).toBe(true);
    expect(isStarredFlag('1')).toBe(true);
  });

  it('treats false, 0, and missing values as not starred', () => {
    expect(isStarredFlag(false)).toBe(false);
    expect(isStarredFlag(0)).toBe(false);
    expect(isStarredFlag('0')).toBe(false);
    expect(isStarredFlag(undefined)).toBe(false);
    expect(isStarredFlag(null)).toBe(false);
  });
});

describe('filterStarredCollections', () => {
  it('keeps deliveries starred from the board 3-dot menu', () => {
    const rows = [
      { id: 'live', name: 'Wedding', is_starred: true },
      { id: 'draft', name: 'Draft', is_starred: 0 },
      { id: 'legacy', name: 'Legacy', is_starred: 1 },
    ];
    expect(filterStarredCollections(rows).map((c) => c.id)).toEqual(['live', 'legacy']);
  });
});

describe('starredWriteValue', () => {
  it('writes 1/0 so D1 and the Starred filter stay aligned', () => {
    expect(starredWriteValue(true)).toBe(1);
    expect(starredWriteValue(false)).toBe(0);
  });
});

describe('mergeStarredBoardAndApi', () => {
  it('keeps a board-starred delivery when the API has not caught up', () => {
    const merged = mergeStarredBoardAndApi(
      [
        { id: 'hack', name: 'CIT HACKATHON', is_starred: 1 },
        { id: 'demo', name: 'Demo 1', is_starred: 0 },
      ],
      [],
    );
    expect(merged.map((c) => c.id)).toEqual(['hack']);
  });

  it('hides a delivery the board already unstarred even if the API still lists it', () => {
    const merged = mergeStarredBoardAndApi(
      [{ id: 'hack', name: 'CIT HACKATHON', is_starred: 0 }],
      [{ id: 'hack', name: 'CIT HACKATHON', is_starred: 1 }],
    );
    expect(merged).toEqual([]);
  });

  it('uses API starred rows that are not on the board yet', () => {
    const merged = mergeStarredBoardAndApi(
      [],
      [{ id: 'hack', name: 'CIT HACKATHON', is_starred: 1 }],
    );
    expect(merged.map((c) => c.id)).toEqual(['hack']);
  });
});
