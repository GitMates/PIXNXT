import { describe, expect, it } from 'vitest';
import {
  expandAiSearchTerms,
  filterPhotosByAiSearch,
  textMatchesSearchTerm,
} from './photoAiSearch';

function photo(id, filename, labels) {
  return { id, filename, collection: { name: 'Logesh x Malavika' } };
}

function meta(entries) {
  const map = {};
  for (const [id, labels] of Object.entries(entries)) {
    map[id] = { labels };
  }
  return map;
}

describe('textMatchesSearchTerm', () => {
  it('matches whole words and necktie compounds, not parties', () => {
    expect(textMatchesSearchTerm('tie', 'tie')).toBe(true);
    expect(textMatchesSearchTerm('bow tie', 'tie')).toBe(true);
    expect(textMatchesSearchTerm('necktie', 'tie')).toBe(true);
    expect(textMatchesSearchTerm('parties', 'tie')).toBe(false);
    expect(textMatchesSearchTerm('suit', 'tie')).toBe(false);
    expect(textMatchesSearchTerm('wedding', 'tie')).toBe(false);
    expect(textMatchesSearchTerm('tiered', 'tie')).toBe(false);
  });
});

describe('expandAiSearchTerms', () => {
  it('does not turn tie into wedding or suit', () => {
    const { expanded } = expandAiSearchTerms('tie');
    expect(expanded).toEqual(expect.arrayContaining(['tie', 'necktie', 'bowtie']));
    expect(expanded).not.toEqual(expect.arrayContaining(['wedding', 'suit', 'groom']));
  });

  it('still expands the food umbrella', () => {
    const { expanded } = expandAiSearchTerms('food');
    expect(expanded).toEqual(expect.arrayContaining(['food', 'meal', 'dish', 'curry']));
  });

  it('does not expand curry to pizza', () => {
    const { expanded } = expandAiSearchTerms('curry');
    expect(expanded).toContain('curry');
    expect(expanded).not.toContain('pizza');
    expect(expanded).not.toContain('food');
  });
});

describe('filterPhotosByAiSearch', () => {
  const photos = [
    photo('tie-1', 'DSC_001.jpg'),
    photo('suit-1', 'DSC_002.jpg'),
    photo('party-1', 'parties-001.jpg'),
    photo('food-1', 'dinner.jpg'),
    photo('curry-1', 'curry-bowl.jpg'),
  ];
  const metadata = meta({
    'tie-1': ['Necktie', 'Person', 'Suit'],
    'suit-1': ['Suit', 'Groom', 'Wedding'],
    'party-1': ['Party', 'People'],
    'food-1': ['Meal', 'Dish', 'Food'],
    'curry-1': ['Curry', 'Plate'],
  });

  it('searching tie only returns photos labeled as a tie', () => {
    const ids = filterPhotosByAiSearch(photos, metadata, 'tie').map((p) => p.id);
    expect(ids).toEqual(['tie-1']);
  });

  it('searching food still finds meals', () => {
    const ids = filterPhotosByAiSearch(photos, metadata, 'food').map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['food-1', 'curry-1']));
    expect(ids).not.toContain('tie-1');
  });

  it('searching curry does not return every meal', () => {
    const ids = filterPhotosByAiSearch(photos, metadata, 'curry').map((p) => p.id);
    expect(ids).toEqual(['curry-1']);
  });
});
