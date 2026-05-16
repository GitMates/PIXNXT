/** Design UI: icon | text. Database: icons | icons_labels */
export type NavigationStyleSetting = 'icon' | 'text';

export function normalizeNavigationStyle(
  value: string | null | undefined
): NavigationStyleSetting {
  if (value === 'text' || value === 'icons_labels') return 'text';
  return 'icon';
}

export function navigationStyleToDb(value: NavigationStyleSetting): 'icons' | 'icons_labels' {
  return value === 'text' ? 'icons_labels' : 'icons';
}
