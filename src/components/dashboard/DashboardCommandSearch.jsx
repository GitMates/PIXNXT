import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function detectIsMac() {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform);
}

function buildCommandItems(modKey) {
  return [
    {
      section: 'GO TO',
      id: 'goto-gallery',
      title: 'Client Gallery',
      detail: 'all deliveries',
      tag: 'Gallery',
      path: '/client-gallery',
      keywords: 'client gallery deliveries',
    },
    {
      section: 'GO TO',
      id: 'goto-albums',
      title: 'Album Proofer',
      detail: 'in proofing',
      tag: 'Albums',
      path: '/album-proofer',
      keywords: 'album proofer proofing',
    },
    {
      section: 'GO TO',
      id: 'goto-portal',
      title: 'Portal',
      detail: 'pipeline',
      tag: 'Portal',
      path: '/portal',
      keywords: 'portal pipeline leads',
    },
    {
      section: 'GO TO',
      id: 'goto-money',
      title: 'Money',
      detail: 'overdue invoices',
      tag: 'Portal',
      path: '/portal',
      keywords: 'money invoices overdue',
    },
    {
      section: 'GO TO',
      id: 'goto-library',
      title: 'Library',
      detail: 'packages',
      tag: 'Library',
      path: '/photos',
      keywords: 'library packages photos',
    },
    {
      section: 'GO TO',
      id: 'goto-settings',
      title: 'Settings',
      detail: 'branding',
      tag: 'Studio',
      path: '/account/studio-identity',
      keywords: 'settings branding studio',
    },
    {
      section: 'CREATE',
      id: 'create-delivery',
      title: 'New delivery',
      detail: null,
      shortcut: `${modKey}N`,
      path: '/deliveries/create',
      keywords: 'new delivery create gallery',
    },
    {
      section: 'CREATE',
      id: 'create-album',
      title: 'New album',
      detail: null,
      path: '/album-proofer/create',
      keywords: 'new album create',
    },
    {
      section: 'CREATE',
      id: 'create-project',
      title: 'New project',
      detail: null,
      path: '/portal',
      keywords: 'new project',
    },
    {
      section: 'CREATE',
      id: 'create-enquiry',
      title: 'Log an enquiry',
      detail: null,
      tag: '15 sec',
      path: '/portal',
      keywords: 'enquiry inquiry lead',
    },
    {
      section: 'DO',
      id: 'do-proposal',
      title: 'Send a proposal to Meera & Rohan',
      detail: null,
      tag: 'Action',
      path: '/portal',
      keywords: 'proposal meera rohan send',
    },
    {
      section: 'DO',
      id: 'do-payment',
      title: 'Record a payment',
      detail: null,
      tag: 'Action',
      path: '/portal',
      keywords: 'payment record money',
    },
    {
      section: 'RECENT',
      id: 'recent-project',
      title: 'Divya & Sanjay — Wedding',
      detail: null,
      tag: 'Project',
      path: '/portal',
      keywords: 'divya sanjay wedding recent',
    },
    {
      section: 'RECENT',
      id: 'recent-invoice',
      title: 'INV-2026-041 · ₹85,000',
      detail: null,
      tag: 'Invoice',
      path: '/portal',
      keywords: 'invoice inv-2026-041 payment',
    },
  ];
}

export default function DashboardCommandSearch() {
  const navigate = useNavigate();
  const isMac = useMemo(() => detectIsMac(), []);
  const modKey = isMac ? '⌘' : 'Ctrl+';
  const searchKbd = isMac ? '⌘K' : 'Ctrl+K';
  const newDeliveryKbd = isMac ? '⌘N' : 'Ctrl+N';

  const allItems = useMemo(() => buildCommandItems(modKey), [modKey]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((item) => {
      const hay = `${item.title} ${item.detail || ''} ${item.tag || ''} ${item.section} ${item.keywords || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allItems, query]);

  const sections = useMemo(() => {
    const order = ['GO TO', 'CREATE', 'DO', 'RECENT'];
    return order
      .map((name) => ({
        name,
        items: filtered.filter((i) => i.section === name),
      }))
      .filter((s) => s.items.length > 0);
  }, [filtered]);

  const flatItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-cmd-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
    inputRef.current?.blur();
  }, []);

  const openPalette = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const runItem = useCallback(
    (item) => {
      if (!item?.path) return;
      close();
      navigate(item.path);
    },
    [close, navigate]
  );

  useEffect(() => {
    const onKeyDown = (e) => {
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (open) close();
        else openPalette();
        return;
      }
      if (meta && (e.key === 'n' || e.key === 'N') && !e.shiftKey && !e.altKey) {
        const tag = (e.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
        e.preventDefault();
        close();
        navigate('/deliveries/create');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close, isMac, navigate, open, openPalette]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [close, open]);

  const onInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!flatItems.length) return;
      setActiveIndex((i) => (i + 1) % flatItems.length);
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!flatItems.length) return;
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
      setOpen(true);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) runItem(item);
    }
  };

  let runningIndex = -1;

  return (
    <div className={`sd-cmd${open ? ' sd-cmd--open' : ''}`} ref={wrapRef}>
      <label className="sd-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls="sd-cmd-list"
          aria-autocomplete="list"
          placeholder="Search anything — clients, albums, invoices..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
        />
        <kbd className="sd-search-kbd" title={isMac ? 'Command K' : 'Windows: Ctrl+K'}>
          {searchKbd}
        </kbd>
      </label>

      {open && (
        <div className="sd-cmd-panel" role="listbox" id="sd-cmd-list">
          <div className="sd-cmd-scroll" ref={listRef}>
            {sections.length === 0 ? (
              <p className="sd-cmd-empty">No matches. Try a name, product, or action.</p>
            ) : (
              sections.map((section) => (
                <div key={section.name} className="sd-cmd-section">
                  <div className="sd-cmd-section-label">{section.name}</div>
                  {section.items.map((item) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const active = index === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-cmd-index={index}
                        className={`sd-cmd-item${active ? ' sd-cmd-item--active' : ''}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => runItem(item)}
                      >
                        <span className="sd-cmd-item-main">
                          <span className="sd-cmd-item-title">{item.title}</span>
                          {item.detail ? (
                            <span className="sd-cmd-item-detail"> — {item.detail}</span>
                          ) : null}
                        </span>
                        {item.shortcut ? (
                          <kbd className="sd-cmd-shortcut" title={isMac ? undefined : 'Windows shortcut'}>
                            {item.id === 'create-delivery' ? newDeliveryKbd : item.shortcut}
                          </kbd>
                        ) : item.tag ? (
                          <span className="sd-cmd-tag">{item.tag}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="sd-cmd-foot">
            <span className="sd-cmd-hints">
              <span>
                <kbd>↑↓</kbd> move
              </span>
              <span>
                <kbd>↵</kbd> open
              </span>
              <span>
                <kbd>esc</kbd> close
              </span>
            </span>
            <span className="sd-cmd-note">
              Returns actions, not only records
              {!isMac ? <span className="sd-cmd-os"> · Windows: {searchKbd}</span> : null}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
