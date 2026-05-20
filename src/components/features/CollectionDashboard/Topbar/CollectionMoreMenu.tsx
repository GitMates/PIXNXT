import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { galleryService } from '@/services/gallery.service';
import { MoveCollectionModal } from '@/components/features/Collections/MoveCollectionModal';

export interface CollectionMoreMenuProps {
  collectionId?: string | null;
  collectionSlug?: string | null;
  collectionName: string;
  photographerId?: string | null;
  currentFolderId?: string | null;
  eventDate?: string | null;
  pinValue?: string;
  clientPasswordDisplay?: string;
  onOpenDownloadSettings?: () => void;
}

function generateSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

export function CollectionMoreMenu({
  collectionId,
  collectionSlug,
  collectionName,
  photographerId,
  currentFolderId = null,
  eventDate,
  pinValue = '',
  clientPasswordDisplay = '',
  onOpenDownloadSettings,
}: CollectionMoreMenuProps) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [applyPresetOpen, setApplyPresetOpen] = useState(false);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPresetsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const galleryUrl =
    collectionSlug && typeof window !== 'undefined'
      ? `${window.location.origin}/gallery/${collectionSlug}`
      : '';

  const closeAll = () => {
    setOpen(false);
    setPresetsOpen(false);
  };

  return (
    <div className="cd-more-wrapper" ref={wrapRef}>
      <button
        type="button"
        className="cd-text-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        More{' '}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="cd-more-dropdown" role="menu">
          <div
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setLinkOpen(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>Get direct link</span>
          </div>
          <div
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setEmailOpen(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6" />
              <path d="M3.32 14A9 9 0 1 0 3 10l-2 1" />
            </svg>
            <span>View email history</span>
          </div>
          <div className={`cd-ctx-item--has-flyout ${presetsOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="cd-ctx-item-trigger"
              aria-expanded={presetsOpen}
              aria-haspopup="menu"
              onClick={(e) => {
                e.stopPropagation();
                setPresetsOpen((p) => !p);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="4" y1="21" y2="14" />
                <line x1="4" x2="4" y1="10" y2="3" />
                <line x1="12" x2="12" y1="21" y2="12" />
                <line x1="12" x2="12" y1="8" y2="3" />
                <line x1="20" x2="20" y1="21" y2="16" />
                <line x1="20" x2="20" y1="12" y2="3" />
                <line x1="2" x2="6" y1="14" y2="14" />
                <line x1="10" x2="14" y1="8" y2="8" />
                <line x1="18" x2="22" y1="12" y2="12" />
              </svg>
              <span>Manage presets</span>
              <svg className="cd-ctx-item-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            {presetsOpen && (
              <div className="cd-preset-flyout" role="menu" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="cd-ctx-item"
                  role="menuitem"
                  onClick={() => {
                    closeAll();
                    setApplyPresetOpen(true);
                  }}
                >
                  <span>Apply preset</span>
                </button>
                <button
                  type="button"
                  className="cd-ctx-item"
                  role="menuitem"
                  onClick={() => {
                    closeAll();
                    setSavePresetOpen(true);
                  }}
                >
                  <span>Save as preset</span>
                </button>
              </div>
            )}
          </div>
          <div
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setMoveOpen(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 12H3" />
              <path d="m11 18 6-6-6-6" />
              <path d="M21 5v14" />
            </svg>
            <span>Move to</span>
          </div>
          <div
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setDuplicateOpen(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>Duplicate</span>
          </div>
          <div
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setDeleteConfirm(false);
              setDeleteOpen(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Delete collection</span>
          </div>
        </div>
      )}

      {linkOpen && (
        <div className="cd-modal-overlay" onClick={() => setLinkOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">GET DIRECT LINK</h3>
              <button type="button" className="cd-modal-close" onClick={() => setLinkOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>COLLECTION URL</label>
                <div style={{ display: 'flex' }}>
                  <input
                    type="text"
                    readOnly
                    value={galleryUrl || 'Publish the collection to get a link'}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px 0 0 4px',
                      fontSize: '14px',
                      backgroundColor: '#f9f9f9',
                      outline: 'none',
                      color: '#555',
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      padding: '0 16px',
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderLeft: 'none',
                      borderRadius: '0 4px 4px 0',
                      cursor: galleryUrl ? 'pointer' : 'default',
                      fontWeight: 500,
                      fontSize: '13px',
                    }}
                    disabled={!galleryUrl}
                    onClick={() => galleryUrl && navigator.clipboard.writeText(galleryUrl)}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>COLLECTION PASSWORD</label>
                <div style={{ display: 'flex' }}>
                  <input
                    type="text"
                    readOnly
                    value={clientPasswordDisplay || 'No password set'}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px 0 0 4px',
                      fontSize: '14px',
                      backgroundColor: '#f9f9f9',
                      outline: 'none',
                      color: '#555',
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      padding: '0 16px',
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderLeft: 'none',
                      borderRadius: '0 4px 4px 0',
                      cursor: clientPasswordDisplay ? 'pointer' : 'default',
                      fontWeight: 500,
                      fontSize: '13px',
                    }}
                    disabled={!clientPasswordDisplay}
                    onClick={() => clientPasswordDisplay && navigator.clipboard.writeText(clientPasswordDisplay)}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>DOWNLOAD PIN</label>
                <div style={{ display: 'flex' }}>
                  <input
                    type="text"
                    readOnly
                    value={pinValue || '—'}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px 0 0 4px',
                      fontSize: '14px',
                      backgroundColor: '#f9f9f9',
                      outline: 'none',
                      color: '#555',
                    }}
                  />
                  <button
                    type="button"
                    style={{
                      padding: '0 16px',
                      backgroundColor: '#fff',
                      border: '1px solid #ddd',
                      borderLeft: 'none',
                      borderRadius: '0 4px 4px 0',
                      cursor: pinValue ? 'pointer' : 'default',
                      fontWeight: 500,
                      fontSize: '13px',
                    }}
                    disabled={!pinValue}
                    onClick={() => pinValue && navigator.clipboard.writeText(pinValue)}
                  >
                    Copy
                  </button>
                </div>
                {onOpenDownloadSettings && (
                  <button
                    type="button"
                    style={{ fontSize: '13px', color: '#2b78c5', marginTop: '8px', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    onClick={() => {
                      setLinkOpen(false);
                      onOpenDownloadSettings();
                    }}
                  >
                    Download Settings
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {emailOpen && (
        <div className="cd-modal-overlay" onClick={() => setEmailOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">EMAIL HISTORY</h3>
              <button type="button" className="cd-modal-close" onClick={() => setEmailOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
                Please note it may take a few minutes for new email history to appear.
              </p>
              <div style={{ border: '1px solid #eee', borderRadius: '6px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#555' }}>EMAIL</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#555' }}>SUBJECT</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#555' }}>DATE SENT</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#555' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
                        No email history found.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {applyPresetOpen && (
        <div className="cd-modal-overlay" onClick={() => setApplyPresetOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">APPLY PRESET TO COLLECTION</h3>
              <button type="button" className="cd-modal-close" onClick={() => setApplyPresetOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#555' }}>Saved presets will appear here once preset storage is connected.</p>
            </div>
            <div className="cd-modal-footer">
              <button type="button" className="cd-cancel-btn" onClick={() => setApplyPresetOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {savePresetOpen && (
        <div className="cd-modal-overlay" onClick={() => setSavePresetOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">SAVE AS PRESET</h3>
              <button type="button" className="cd-modal-close" onClick={() => setSavePresetOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Name your preset to reuse these design settings on other collections.</p>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', display: 'block', marginBottom: '8px' }}>PRESET NAME</label>
              <input type="text" placeholder="e.g. Standard Wedding" style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div className="cd-modal-footer">
              <button type="button" className="cd-cancel-btn" onClick={() => setSavePresetOpen(false)}>
                Cancel
              </button>
              <button type="button" className="cd-save-btn" onClick={() => setSavePresetOpen(false)}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <MoveCollectionModal
        isOpen={moveOpen}
        onClose={() => setMoveOpen(false)}
        collectionId={collectionId}
        photographerId={photographerId}
        currentFolderId={currentFolderId}
      />

      {duplicateOpen && (
        <div className="cd-modal-overlay" onClick={() => setDuplicateOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">DUPLICATE COLLECTION</h3>
              <button type="button" className="cd-modal-close" onClick={() => setDuplicateOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Create a new empty collection with the same name pattern? Photos are not copied in this build.</p>
              <p style={{ fontSize: '13px', color: '#666' }}>A full duplicate would copy photos in storage and can be added later.</p>
            </div>
            <div className="cd-modal-footer">
              <button type="button" className="cd-cancel-btn" onClick={() => setDuplicateOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="cd-save-btn"
                disabled={!photographerId || busy}
                onClick={async () => {
                  if (!photographerId) return;
                  try {
                    setBusy(true);
                    if (!collectionId) {
                      alert('Collection not loaded. Refresh and try again.');
                      return;
                    }
                    const newRow = await galleryService.duplicateCollection(collectionId, photographerId);
                    setDuplicateOpen(false);
                    navigate(`/collections/manage?id=${newRow.id}`);
                  } catch (err) {
                    console.error(err);
                    alert('Failed to duplicate collection.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Working…' : 'Duplicate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="cd-modal-overlay" onClick={() => setDeleteOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">DELETE COLLECTION</h3>
              <button type="button" className="cd-modal-close" onClick={() => setDeleteOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Are you sure you want to delete this collection?</p>
              <p style={{ fontSize: '14px', color: '#555', marginBottom: '24px' }}>
                <strong>Warning:</strong> All photos and past activities will be permanently removed.
              </p>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.checked)}
                  style={{ marginTop: '4px', width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '13px', color: '#333' }}>I accept that this collection will be permanently deleted</span>
              </label>
            </div>
            <div className="cd-modal-footer">
              <button type="button" className="cd-cancel-btn" onClick={() => setDeleteOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="cd-save-btn"
                style={{ backgroundColor: '#e53e3e', borderColor: '#e53e3e', opacity: deleteConfirm ? 1 : 0.5 }}
                disabled={!deleteConfirm || !collectionId || busy}
                onClick={async () => {
                  if (!collectionId) return;
                  try {
                    setBusy(true);
                    await galleryService.deleteCollection(collectionId);
                    setDeleteOpen(false);
                    navigate('/dashboard');
                  } catch (err) {
                    console.error(err);
                    alert('Failed to delete collection.');
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
