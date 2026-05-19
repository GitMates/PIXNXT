import {
  CoverStyleId,
  FontId,
  PaletteId,
  AspectRatioId,
} from "../types/design.types";

export const COVER_STYLES: { id: CoverStyleId; name: string }[] = [
  { id: "center", name: "Center" },
  { id: "left", name: "Left" },
  { id: "novel", name: "Novel" },
  { id: "vintage", name: "Vintage" },
  { id: "frame", name: "Frame" },
  { id: "stripe", name: "Stripe" },
  { id: "divider", name: "Divider" },
  { id: "journal", name: "Journal" },
  { id: "stamp", name: "Stamp" },
  { id: "outline", name: "Outline" },
  { id: "classic", name: "Classic" },
  { id: "none", name: "None" },
];

export const TYPOGRAPHY_OPTIONS: {
  id: FontId;
  name: string;
  desc: string;
  sample: string;
}[] = [
    { id: "sans", name: "Sans", desc: "A neutral font", sample: "SANS" },
    { id: "serif", name: "Serif", desc: "A classic font", sample: "Serif" },
    {
      id: "modern",
      name: "Modern",
      desc: "A sophisticated font",
      sample: "Modern",
    },
    {
      id: "timeless",
      name: "Timeless",
      desc: "A light and airy font",
      sample: "Timeless",
    },
    { id: "bold", name: "Bold", desc: "A punchy font", sample: "BOLD" },
    { id: "subtle", name: "Subtle", desc: "A minimal font", sample: "SUBTLE" },
  ];

export const COLOR_PALETTES: {
  id: PaletteId;
  name: string;
  colors: string[];
}[] = [
    { id: "light", name: "Light", colors: ["#ffffff", "#f7f9fa", "#111111"] },
    { id: "gold", name: "Gold", colors: ["#ffffff", "#faf7f2", "#a68c5b"] },
    { id: "rose", name: "Rose", colors: ["#ffffff", "#faf4f4", "#a67d7d"] },
    {
      id: "terracotta",
      name: "Terracotta",
      colors: ["#ffffff", "#faf5f2", "#a66d5b"],
    },
    { id: "sand", name: "Sand", colors: ["#ffffff", "#f7f5f2", "#967b6b"] },
    { id: "olive", name: "Olive", colors: ["#ffffff", "#f5f7f2", "#8c966b"] },
    { id: "agave", name: "Agave", colors: ["#ffffff", "#f2f7f6", "#6b968c"] },
    { id: "sea", name: "Sea", colors: ["#ffffff", "#f2f4f7", "#6b7a96"] },
    { id: "dark", name: "Dark", colors: ["#1a1a1a", "#111111", "#988383"] },
  ];

export const GRID_STYLES: { id: "vertical" | "horizontal"; name: string }[] = [
  { id: "vertical", name: "Vertical" },
  { id: "horizontal", name: "Horizontal" },
];

export const THUMBNAIL_SIZES: {
  id: "x-small" | "small" | "regular" | "large";
  name: string;
}[] = [
    { id: "x-small", name: "X-Small" },
    { id: "small", name: "Small" },
    { id: "regular", name: "Regular" },
    { id: "large", name: "Large" },
  ];

export const GRID_SPACING: {
  id: "none" | "small" | "regular" | "large";
  name: string;
}[] = [
    { id: "none", name: "None" },
    { id: "small", name: "Small" },
    { id: "regular", name: "Regular" },
    { id: "large", name: "Large" },
  ];

export const ASPECT_RATIOS: { id: AspectRatioId; name: string }[] = [
  { id: "original", name: "Original" },
  { id: "square", name: "Square (1:1)" },
  { id: "3-2", name: "3:2" },
  { id: "4-5", name: "4:5" },
  { id: "16-9", name: "16:9" },
];

export const NAVIGATION_STYLES: { id: "icon" | "text"; name: string }[] = [
  { id: "icon", name: "Icons Only" },
  { id: "text", name: "Icons & Text" },
];
