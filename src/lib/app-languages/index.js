/**
 * Studio-app languages — one file per language, resolved here.
 * This is the photographer's own UI language (dashboard, sidebars,
 * account). Client galleries use each delivery's own language
 * (see ../gallery-languages) and are unaffected by this setting.
 *
 * Add a language by creating `<id>.js` exporting `<id>AppStrings` and
 * registering it in STRINGS_BY_ID + normalizeAppLanguage below.
 */
import { englishAppStrings } from './english';
import { hindiAppStrings } from './hindi';
import { tamilAppStrings } from './tamil';

export const APP_LANGUAGE_IDS = ['English', 'Hindi', 'Tamil'];

const STRINGS_BY_ID = {
  English: englishAppStrings,
  Hindi: hindiAppStrings,
  Tamil: tamilAppStrings,
};

export function normalizeAppLanguage(raw) {
  const s = String(raw || '').trim();
  const lower = s.toLowerCase();
  if (lower.startsWith('hi') || lower === 'hindi' || s === 'हिन्दी') return 'Hindi';
  if (lower.startsWith('ta') || lower === 'tamil' || s === 'தமிழ்') return 'Tamil';
  return 'English';
}

export function appLanguageLabel(id) {
  if (id === 'Hindi') return 'हिन्दी';
  if (id === 'Tamil') return 'தமிழ்';
  return 'English';
}

export function appUiStrings(language) {
  const id = normalizeAppLanguage(language);
  return STRINGS_BY_ID[id] || STRINGS_BY_ID.English;
}

function localizeFragment(t, s) {
  const exact = t?.phrases?.[s];
  if (exact) return exact;
  const p = t?.patterns;
  if (!p) return s;
  let m;
  if ((m = /^(\d+) drafts?$/.exec(s))) return p.drafts(Number(m[1]));
  if ((m = /^Waiting (\d+) days?$/.exec(s))) return p.waitingDays(Number(m[1]));
  if ((m = /^(\d+) in production$/.exec(s))) return p.inProduction(Number(m[1]));
  if ((m = /^(\d+) unopened$/.exec(s))) return p.unopened(Number(m[1]));
  if ((m = /^(\d+) need review$/.exec(s))) return p.needReview(Number(m[1]));
  if ((m = /^(\d+) guests? need review or delivery$/.exec(s))) return p.guestsNeed(Number(m[1]));
  if ((m = /^(\d+) albums? need attention$/.exec(s))) return p.albumsNeed(Number(m[1]));
  if ((m = /^(\d+) guests? need review$/.exec(s))) return p.guestsReview(Number(m[1]));
  if ((m = /^(\d+) deliver(?:y is|ies are) still unopened$/.exec(s))) return p.stillUnopened(Number(m[1]));
  if ((m = /^(\d+) items? need you$/.exec(s))) return p.itemsNeed(Number(m[1]));
  return s;
}

/** Exact studio-app phrases, then a few counted sentences. Unknown text stays as-is. */
export function localizeAppText(t, text) {
  if (text == null) return text;
  const s = String(text);
  const direct = localizeFragment(t, s);
  if (direct !== s) return direct;
  const clear = '. Everything looks clear — no clients waiting on you.';
  if (s.endsWith(clear) && t?.patterns?.allClearRest) {
    return `${s.slice(0, -clear.length)}. ${t.patterns.allClearRest}`;
  }
  const dot = s.indexOf('. ');
  if (dot > 0) {
    const head = s.slice(0, dot);
    const rest = s.slice(dot + 2).replace(/\.$/, '');
    const bits = rest.split(', ');
    const next = bits.map((bit) => localizeFragment(t, bit));
    if (next.some((bit, i) => bit !== bits[i])) {
      return `${head}. ${next.join(', ')}.`;
    }
  }
  return s;
}
