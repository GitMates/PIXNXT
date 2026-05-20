import { useLayoutEffect, useState } from 'react';

const MENU_WIDTH = 228;

/** Fixed viewport position for portaled card context menus (avoids scroll/overflow clipping). */
export function useContextMenuPortalLayout(anchorEl, variant = 'grid') {
  const [layout, setLayout] = useState(null);

  useLayoutEffect(() => {
    if (!anchorEl) {
      setLayout(null);
      return undefined;
    }

    const update = () => {
      const anchorRect = anchorEl.getBoundingClientRect();
      const card = anchorEl.closest?.('.cg-style-73');
      const cardRect = card?.getBoundingClientRect() ?? anchorRect;
      const viewportPad = 8;

      if (variant === 'list') {
        setLayout({
          top: anchorRect.bottom + 4,
          left: Math.max(viewportPad, Math.min(anchorRect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - viewportPad)),
        });
        return;
      }

      setLayout({
        top: cardRect.top + 12,
        left: Math.max(viewportPad, Math.min(cardRect.right - MENU_WIDTH - 12, window.innerWidth - MENU_WIDTH - viewportPad)),
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorEl, variant]);

  return layout;
}
