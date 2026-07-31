/**
 * Shared Client Gallery–aligned style tokens for Lab portal (UI only).
 * Prefer CSS classes from labTheme.css; use these for remaining inline styles.
 */
export const LAB_UI = {
  bg: '#F9F9F7',
  surface: '#FAFAF8',
  card: '#FFFFFF',
  foreground: '#1A1A1A',
  muted: '#71717A',
  border: '#ECEAE6',
  hover: '#F4F3F0',
  inset: '#F2F1ED',
  primary: '#1A1A1A',
  danger: '#B91C1C',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  success: '#207C50',
  successBg: '#ECFDF5',
  font: "var(--font-sans)",
  titleFont: "'Playfair Display', Georgia, 'Times New Roman', serif",
};

export const labPageStyle = {
  padding: '28px 32px',
  backgroundColor: LAB_UI.bg,
  minHeight: '100%',
  boxSizing: 'border-box',
  fontFamily: LAB_UI.font,
  color: LAB_UI.foreground,
};

export const labTitleStyle = {
  margin: 0,
  fontFamily: LAB_UI.titleFont,
  fontSize: 28,
  fontWeight: 500,
  letterSpacing: '-0.02em',
  color: LAB_UI.foreground,
  textTransform: 'none',
};

export const labCardStyle = {
  backgroundColor: LAB_UI.card,
  border: `1px solid ${LAB_UI.border}`,
  borderRadius: 16,
  padding: 16,
  boxShadow: '-4px -4px 12px rgba(255,255,255,0.7), 4px 4px 14px rgba(0,0,0,0.04)',
};

export const labBtnPrimaryStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 40,
  padding: '0 20px',
  borderRadius: 9999,
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  fontFamily: LAB_UI.font,
  backgroundImage: 'linear-gradient(180deg, #4D4D4D, #333333)',
  color: '#FFFFFF',
  boxShadow: '0 1px 0 0 rgba(255,255,255,0.15) inset, 0 12px 24px -10px rgba(0,0,0,0.45)',
};

export const labBtnSecondaryStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height: 40,
  padding: '0 16px',
  borderRadius: 9999,
  border: `1px solid ${LAB_UI.border}`,
  background: LAB_UI.card,
  color: LAB_UI.foreground,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: LAB_UI.font,
  boxShadow: '-3px -3px 8px rgba(255,255,255,0.75), 3px 3px 9px rgba(0,0,0,0.06)',
};

export const labSearchInputStyle = {
  width: '100%',
  height: 40,
  border: 0,
  outline: 'none',
  borderRadius: 9999,
  padding: '0 14px 0 36px',
  fontSize: 14,
  color: LAB_UI.foreground,
  backgroundColor: LAB_UI.inset,
  boxShadow: 'inset 3px 3px 7px rgba(0,0,0,0.08), inset -3px -3px 7px rgba(255,255,255,0.85)',
  fontFamily: LAB_UI.font,
};

export const labTableHeadStyle = {
  backgroundColor: LAB_UI.primary,
  color: '#FFFFFF',
};
