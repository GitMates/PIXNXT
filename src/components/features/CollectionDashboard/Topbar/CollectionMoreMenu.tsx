import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { galleryService } from '@/services/gallery.service';
import { MoveCollectionModal } from '@/components/features/Collections/MoveCollectionModal';
import { CollectionDuplicateModal } from '@/components/features/ClientGallery/CollectionShareModals';

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
  const [emailHistory, setEmailHistory] = useState<
    { id: string; email: string; subject: string; date: string; status: string }[]
  >([]);
  const [emailHistoryLoading, setEmailHistoryLoading] = useState(false);
  const [emailHistoryError, setEmailHistoryError] = useState('');
  const [emailHistoryHelpOpen, setEmailHistoryHelpOpen] = useState(false);
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

  useEffect(() => {
    if (!emailOpen || !collectionId) return undefined;
    let cancelled = false;
    const load = async () => {
      setEmailHistoryLoading(true);
      setEmailHistoryError('');
      try {
        const rows = await galleryService.getCollectionShareEmailHistory(collectionId);
        if (cancelled) return;
        setEmailHistory(
          (rows || []).map((item: any) => {
            const raw = String(item.status || 'Sent').trim().toLowerCase();
            let status = 'Sent';
            if (raw === 'pending' || raw === 'sending' || raw === 'queued') status = 'Pending';
            else if (raw === 'rejected' || raw === 'bounced' || raw === 'failed' || raw === 'bounce') status = 'Rejected';
            else if (raw === 'scheduled') status = 'Scheduled';
            else if (raw === 'sent' || raw === 'delivered') status = 'Sent';
            else status = String(item.status || 'Sent').replace(/^\w/, (c: string) => c.toUpperCase());
            return {
              id: item.id,
              email: item.recipient_email,
              subject: item.subject || '—',
              date: new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }),
              status,
            };
          })
        );
      } catch (err: any) {
        console.error('Failed to load email history:', err);
        if (!cancelled) {
          setEmailHistory([]);
          setEmailHistoryError(err?.message || 'Failed to load email history.');
        }
      } finally {
        if (!cancelled) setEmailHistoryLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [emailOpen, collectionId]);

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
            <span>Delete delivery</span>
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
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>DELIVERY URL</label>
                <div style={{ display: 'flex' }}>
                  <input
                    type="text"
                    readOnly
                    value={galleryUrl || 'Publish the delivery to get a link'}
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
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#666', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>DELIVERY PASSWORD</label>
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
        <div className="cd-modal-overlay" onClick={() => { setEmailOpen(false); setEmailHistoryHelpOpen(false); }}>
          <div className="cd-modal cd-email-history-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                EMAIL HISTORY
                <button
                  type="button"
                  className="cd-email-history-help-btn"
                  aria-expanded={emailHistoryHelpOpen}
                  aria-label="About email statuses"
                  onClick={() => setEmailHistoryHelpOpen((v) => !v)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </button>
              </h3>
              <button type="button" className="cd-modal-close" onClick={() => { setEmailOpen(false); setEmailHistoryHelpOpen(false); }} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <p className="cd-email-history-intro">
                Emails sent for this delivery will be listed here. Note that email history might take up to a few minutes to show up.
              </p>

              {emailHistoryHelpOpen && (
                <div className="cd-email-history-help">
                  <div className="cd-email-history-help-block">
                    <h4>Pending</h4>
                    <p>After you click Send, the invite may show as Pending while it is still being delivered. This can take up to a couple of minutes. Once delivered, the status updates to Sent.</p>
                  </div>
                  <div className="cd-email-history-help-block">
                    <h4>Sent</h4>
                    <p>The email was accepted for delivery. If your client still does not see it, ask them to check junk/spam/promotions, or wait for their email provider to finish delivery.</p>
                  </div>
                  <div className="cd-email-history-help-block">
                    <h4>Rejected</h4>
                    <p>The email bounced and was rejected by the recipient’s server (soft bounce: temporary issues like a full mailbox; hard bounce: invalid address or permanent block). Rejected emails are not re-delivered — send again with a corrected address if needed.</p>
                  </div>
                  <div className="cd-email-history-help-block">
                    <h4>DIY personal invite</h4>
                    <p>If email delivery is unreliable, share a direct link instead (text message, WhatsApp, etc.).</p>
                    <button
                      type="button"
                      className="cd-email-history-link-btn"
                      onClick={() => {
                        setEmailOpen(false);
                        setEmailHistoryHelpOpen(false);
                        setLinkOpen(true);
                      }}
                    >
                      Get direct link
                    </button>
                  </div>
                </div>
              )}

              <div className="cd-email-history-table-wrap">
                <table className="cd-email-history-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Subject</th>
                      <th>Date Sent</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailHistoryLoading ? (
                      <tr>
                        <td colSpan={4} className="cd-email-history-empty">Loading…</td>
                      </tr>
                    ) : emailHistoryError ? (
                      <tr>
                        <td colSpan={4} className="cd-email-history-empty cd-email-history-empty--error">
                          {emailHistoryError}
                        </td>
                      </tr>
                    ) : emailHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="cd-email-history-empty">No email history found.</td>
                      </tr>
                    ) : (
                      emailHistory.map((item) => (
                        <tr key={item.id}>
                          <td>{item.email}</td>
                          <td>{item.subject}</td>
                          <td>{item.date}</td>
                          <td>
                            <span className={`cd-email-status cd-email-status--${item.status.toLowerCase()}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="cd-email-history-diy">
                <span>Having trouble with email delivery?</span>
                <button
                  type="button"
                  className="cd-email-history-link-btn"
                  onClick={() => {
                    setEmailOpen(false);
                    setEmailHistoryHelpOpen(false);
                    setLinkOpen(true);
                  }}
                >
                  Get direct link
                </button>
              </div>
            </div>
            <div className="cd-modal-footer">
              <button type="button" className="cd-cancel-btn" onClick={() => { setEmailOpen(false); setEmailHistoryHelpOpen(false); }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {applyPresetOpen && (
        <div className="cd-modal-overlay" onClick={() => setApplyPresetOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">APPLY PRESET TO DELIVERY</h3>
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
              <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Name your preset to reuse these design settings on other deliveries.</p>
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

      <CollectionDuplicateModal
        collection={duplicateOpen && collectionId ? { id: collectionId, name: collectionName } : null}
        isOpen={duplicateOpen}
        onClose={() => setDuplicateOpen(false)}
        busy={busy}
        onConfirm={async () => {
          if (!photographerId || !collectionId) {
            alert('Delivery not loaded. Refresh and try again.');
            return;
          }
          try {
            setBusy(true);
            const newRow = await galleryService.duplicateCollection(collectionId, photographerId);
            setDuplicateOpen(false);
            navigate(`/deliveries/manage?id=${newRow.id}`);
          } catch (err) {
            console.error(err);
            alert(err?.message || 'Failed to duplicate delivery. Please try again.');
          } finally {
            setBusy(false);
          }
        }}
      />

      {deleteOpen && (
        <div className="cd-modal-overlay" onClick={() => setDeleteOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">DELETE DELIVERY</h3>
              <button type="button" className="cd-modal-close" onClick={() => setDeleteOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>Are you sure you want to delete this delivery?</p>
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
                <span style={{ fontSize: '13px', color: '#333' }}>I accept that this delivery will be permanently deleted</span>
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
                    alert('Failed to delete delivery.');
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
