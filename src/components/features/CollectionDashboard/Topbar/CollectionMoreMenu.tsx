import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { galleryService } from '@/services/gallery.service';
import { formatStorageBytes } from '@/utils/formatStorageBytes';
import { MoveCollectionModal } from '@/components/features/Collections/MoveCollectionModal';
import { CollectionDuplicateModal } from '@/components/features/ClientGallery/CollectionShareModals';
import { supabase } from '@/lib/supabase/client';
import { guestDeliveryGuestsService } from '@/services/guestDeliveryGuests.service';

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
  const [setsLiveCount, setSetsLiveCount] = useState<number | null>(null);
  const [storageLabel, setStorageLabel] = useState<string>('');
  const [shortcutLabel, setShortcutLabel] = useState<string>('⌘D');
  const [statsLoading, setStatsLoading] = useState(false);

  // New menu feature states
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(collectionName);
  const [pushOpen, setPushOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  // Sync rename input when collectionName changes
  useEffect(() => {
    setNewName(collectionName);
  }, [collectionName]);

  // Ctrl+D on Windows/Linux; ⌘D on Mac
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
    setShortcutLabel(isMac ? '⌘D' : 'Ctrl+D');

    const handleKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName || '';
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (target && target.getAttribute && target.getAttribute('contenteditable') === 'true');
      if (isEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setDuplicateOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  // Load dynamic counts & storage when menu opens
  useEffect(() => {
    if (!open || !collectionId) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        setStatsLoading(true);
        const data = await galleryService.getCollectionById(collectionId);
        if (cancelled) return;
        const setsCount = Array.isArray(data.sets) ? data.sets.length : 0;
        setSetsLiveCount(setsCount);

        let bytes = 0;
        if (Number(data.total_size_bytes) > 0) {
          bytes = Number(data.total_size_bytes);
        } else if (Array.isArray(data.photos)) {
          bytes = data.photos.reduce((s, p) => s + (Number(p.size_bytes) || 0), 0);
        }
        const label = formatStorageBytes(bytes);
        setStorageLabel(label);
        console.debug('Collection stats loaded', { collectionId, setsCount, bytes, label });
      } catch (err) {
        console.error('Failed to load collection stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, collectionId]);

  const handleRename = async () => {
    if (!newName.trim() || !collectionId) return;
    setBusy(true);
    try {
      await galleryService.updateCollection(collectionId, { name: newName.trim() });
      setRenameOpen(false);
      window.location.reload();
    } catch (err) {
      alert('Failed to rename delivery.');
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!collectionId) return;
    setBusy(true);
    try {
      await galleryService.updateCollection(collectionId, { delivery_status: 'archived' });
      setArchiveConfirmOpen(false);
      alert('Delivery archived successfully!');
      window.location.reload();
    } catch (err) {
      alert('Failed to archive delivery.');
    } finally {
      setBusy(false);
    }
  };

  const handleExportGuests = async () => {
    if (!collectionId) return;
    try {
      const { data: events } = await supabase
        .from('guest_delivery_events')
        .select('id, photographer_id')
        .eq('collection_id', collectionId);

      if (!events || events.length === 0) {
        alert('No guest registrations found for this delivery.');
        return;
      }

      const event = events[0];
      const guests = await guestDeliveryGuestsService.getGuests(event.photographer_id, event.id);

      if (!guests || guests.length === 0) {
        alert('No registered guests found.');
        return;
      }

      const headers = ['Name', 'Email', 'Phone', 'Registered At', 'Delivery Status', 'Matched Photos'];
      const rows = guests.map((g) => [
        g.name || '',
        g.email || '',
        g.phone || '',
        g.registered_at ? new Date(g.registered_at).toLocaleString() : '',
        g.delivery_status || '',
        g.matched_photo_count || 0
      ]);

      const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${generateSlug(collectionName)}_guests.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert('Failed to export guest list.');
    }
  };

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
          <div className="cd-dropdown-section-title">THIS DELIVERY</div>
          <button
            type="button"
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setDuplicateOpen(true);
            }}
          >
            <span>Duplicate</span>
            <span className="cd-dropdown-right-label">{shortcutLabel}</span>
          </button>
          <button
            type="button"
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setRenameOpen(true);
            }}
          >
            <span>Rename</span>
          </button>
          <button
            type="button"
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setMoveOpen(true);
            }}
          >
            <span>Move to folder</span>
          </button>

          <div className="cd-dropdown-divider" />
          <div className="cd-dropdown-section-title">MOBILE APP</div>
          <button
            type="button"
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setPushOpen(true);
            }}
          >
            <span>Push to the app...</span>
            <span className="cd-dropdown-right-label">{statsLoading ? 'Loading...' : (setsLiveCount != null ? `${setsLiveCount} sets live` : '—')}</span>
          </button>

          <div className="cd-dropdown-divider" />
          <div className="cd-dropdown-section-title">EXPORT</div>
          <button
            type="button"
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              onOpenDownloadSettings?.();
            }}
          >
            <span>Download everything</span>
            <span className="cd-dropdown-right-label">{statsLoading ? 'Loading...' : (storageLabel || '—')}</span>
          </button>
          <button
            type="button"
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              onOpenDownloadSettings?.();
            }}
          >
            <span>Download a set...</span>
          </button>
          <button
            type="button"
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              void handleExportGuests();
            }}
          >
            <span>Export guest list (CSV)</span>
          </button>

          <div className="cd-dropdown-divider" />
          <div className="cd-dropdown-section-title">DANGER</div>
          <button
            type="button"
            className="cd-ctx-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setArchiveConfirmOpen(true);
            }}
          >
            <span>Archive</span>
          </button>
          <button
            type="button"
            className="cd-ctx-item cd-dropdown-danger-item"
            role="menuitem"
            onClick={() => {
              closeAll();
              setDeleteConfirm(false);
              setDeleteOpen(true);
            }}
          >
            <span>Delete delivery</span>
          </button>
        </div>
      )}

      {renameOpen && (
        <div className="cd-modal-overlay" onClick={() => setRenameOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">Rename Delivery</h3>
              <button type="button" className="cd-modal-close" onClick={() => setRenameOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <input
                type="text"
                className="cd-basics-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="Enter new name"
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" className="cd-basics-btn" onClick={() => setRenameOpen(false)}>Cancel</button>
                <button type="button" className="cd-basics-btn" style={{ backgroundColor: '#2c2520', color: '#fff' }} onClick={handleRename} disabled={busy}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {archiveConfirmOpen && (
        <div className="cd-modal-overlay" onClick={() => setArchiveConfirmOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">Archive Delivery</h3>
              <button type="button" className="cd-modal-close" onClick={() => setArchiveConfirmOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <p style={{ margin: 0, fontSize: '14.5px', color: '#555', lineHeight: 1.5 }}>Are you sure you want to archive this delivery? This will hide it from active views.</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" className="cd-basics-btn" onClick={() => setArchiveConfirmOpen(false)}>Cancel</button>
                <button type="button" className="cd-basics-btn" style={{ backgroundColor: '#2c2520', color: '#fff' }} onClick={handleArchive} disabled={busy}>Archive</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pushOpen && (
        <div className="cd-modal-overlay" onClick={() => setPushOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="cd-modal-header">
              <h3 className="cd-modal-title">Mobile App Sync</h3>
              <button type="button" className="cd-modal-close" onClick={() => setPushOpen(false)} aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="cd-modal-body" style={{ padding: '24px' }}>
              <p style={{ margin: 0, fontSize: '14.5px', color: '#555', lineHeight: 1.5 }}>
                Pushing this delivery sets to the client mobile app.
                {setsLiveCount != null
                  ? ` (${setsLiveCount === 1 ? '1 set live' : `${setsLiveCount} sets live`})`
                  : ''}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <button type="button" className="cd-basics-btn" style={{ backgroundColor: '#2c2520', color: '#fff' }} onClick={() => setPushOpen(false)}>Close</button>
              </div>
            </div>
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
