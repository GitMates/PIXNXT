/**
 * Default cover when a delivery has no photo.
 * Palette 0 is the shipped terracotta (guest recent-work stops).
 * Angle and stop positions are the dashboard recent-work gradient:
 * 145deg, 0% / 55% / 100%. Only the three colors change per palette.
 * Order is part of the contract — appending is safe; reordering recolors
 * every existing delivery.
 */

export const COVER_GRADIENT_ANGLE = '145deg';

/** @typedef {readonly [dark: string, mid: string, light: string]} CoverPalette */

/** @type {readonly CoverPalette[]} */
export const COVER_PALETTES = Object.freeze([
  Object.freeze(['#5A2A1A', '#A85830', '#D4A060']), // 0 terracotta
  Object.freeze(['#2F3B2C', '#5F7A52', '#A9B98C']), // 1 sage
  Object.freeze(['#5A2B33', '#A55A63', '#E0A89B']), // 2 dusty rose
  Object.freeze(['#1F2E42', '#44627F', '#9DB4C4']), // 3 ink blue
  Object.freeze(['#5A4210', '#946A12', '#E3C26F']), // 4 mustard
  Object.freeze(['#3F2236', '#7A4466', '#C99BB0']), // 5 plum
  Object.freeze(['#2B3034', '#5A666E', '#A8B3B6']), // 6 slate
  Object.freeze(['#3B3A1C', '#77762F', '#BDBB77']), // 7 olive
  Object.freeze(['#17383A', '#2F6B6A', '#8DBBB2']), // 8 deep teal
  Object.freeze(['#4D3F2E', '#876F4F', '#DCC9A5']), // 9 dune
]);

/** FNV-1a, 32-bit. Stable across runtimes. */
export function hash32(s) {
  let h = 0x811c9dc5;
  const value = String(s ?? '');
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function defaultCoverPaletteIndex(deliveryId) {
  return hash32(deliveryId) % COVER_PALETTES.length;
}

export function defaultCoverGradient(deliveryId) {
  const [dark, mid, light] = COVER_PALETTES[defaultCoverPaletteIndex(deliveryId)];
  return `linear-gradient(${COVER_GRADIENT_ANGLE}, ${dark} 0%, ${mid} 55%, ${light} 100%)`;
}
