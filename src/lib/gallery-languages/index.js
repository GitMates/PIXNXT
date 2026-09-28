/**
 * Gallery visitor languages — one file per language, resolved here.
 * Add a new language by creating `<id>.js` exporting `<id>Strings` and
 * registering it in STRINGS_BY_ID + normalizeGalleryLanguage below.
 */
import { englishStrings } from './english';
import { hindiStrings } from './hindi';
import { tamilStrings } from './tamil';

const STRINGS_BY_ID = {
  English: englishStrings,
  Hindi: hindiStrings,
  Tamil: tamilStrings,
};

export function normalizeGalleryLanguage(raw) {
  const s = String(raw || 'English').trim();
  const lower = s.toLowerCase();
  if (lower.startsWith('hi') || lower === 'hindi' || s === 'हिन्दी') return 'Hindi';
  if (lower.startsWith('ta') || lower === 'tamil' || s === 'தமிழ்') return 'Tamil';
  return 'English';
}

export function galleryHtmlLang(language) {
  const id = normalizeGalleryLanguage(language);
  if (id === 'Hindi') return 'hi';
  if (id === 'Tamil') return 'ta';
  return 'en';
}

export function galleryUiStrings(language) {
  const id = normalizeGalleryLanguage(language);
  return STRINGS_BY_ID[id] || STRINGS_BY_ID.English;
}
