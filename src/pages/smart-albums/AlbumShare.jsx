import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Mail, Check, X, History, Palette, ChevronRight } from 'lucide-react';
import { apiFetch } from '../../lib/api/client';
import { getProfile, getUser } from '../../services/auth.service';
import { smartAlbumsService } from '../../services/smartAlbums.service';
import {
    smartAlbumProoferSettingsService,
    getAlbumShareDisplayUrl,
} from '../../services/smartAlbumProoferSettings.service';
import {
    clientGalleryEmailTemplatesService,
    resolveTemplateBody,
} from '../../services/clientGalleryEmailTemplates.service';
import RichTextEditor from '../../components/RichTextEditor';
import { AppLoader } from '../../components/ui/AppLoading';
import '../CollectionShare.css';

function htmlToPlainText(html) {
    if (!html) return '';
    let text = String(html)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n\n');
    try {
        const tempEl = document.createElement('div');
        tempEl.innerHTML = text;
        return (tempEl.textContent || tempEl.innerText || '').trim();
    } catch {
        return text.replace(/<[^>]+>/g, '').trim();
    }
}

function paragraphsFromPlain(text) {
    return String(text || '')
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
        .join('');
}

const DEFAULT_ALBUM_BODY = `Hi,

Your album proof is ready to review. Click the View Album button to open your personalized proof.

Tap any spread to leave a comment or ask for a photo swap. When you're happy, you can approve from the same link.

Cheers,
Your Name`;

const AlbumShare = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const albumId = searchParams.get('id');

    const [album, setAlbum] = useState(null);
    const [proofer, setProofer] = useState(null);
    const [profile, setProfile] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    const [recipientEmail, setRecipientEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [includeAccessPin, setIncludeAccessPin] = useState(false);
    const [includeApprovalPin, setIncludeApprovalPin] = useState(false);

    const [showMoreDropdown, setShowMoreDropdown] = useState(false);
    const [showChooseThemeSubmenu, setShowChooseThemeSubmenu] = useState(false);
    const [theme, setTheme] = useState('classic');
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [emailHistory, setEmailHistory] = useState(() => {
        const stored = localStorage.getItem(`album_email_history_${albumId}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                /* ignore */
            }
        }
        return [];
    });
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const moreDropdownRef = useRef(null);
    const dropdownRef = useRef(null);

    const editorPath = albumId ? `/album-proofer/album/${albumId}` : '/album-proofer';

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const fetchData = useCallback(async () => {
        if (!albumId) return;
        try {
            setLoading(true);
            const activeUser = await getUser().catch(() => null);
            setCurrentUser(activeUser);

            let prof = null;
            if (activeUser?.id) {
                prof = await getProfile(activeUser.id).catch(() => null);
                if (prof) setProfile(prof);

                const tpls = await clientGalleryEmailTemplatesService.getTemplates(activeUser.id);
                const sharingTpls = tpls
                    .filter(
                        (t) =>
                            t.category === 'album-sharing' ||
                            t.category === 'delivery-sharing' ||
                            t.category === 'collection-sharing' ||
                            (t.isSystem && t.category !== 'auto-expiry')
                    )
                    .filter((t) => t.category !== 'auto-expiry')
                    .sort((a, b) => {
                        const score = (t) => (t.category === 'album-sharing' ? 0 : 1);
                        return score(a) - score(b);
                    });
                setTemplates(sharingTpls);
            }

            const col = await smartAlbumsService.getAlbum(activeUser?.id, albumId);
            setAlbum(col);

            const settings = activeUser?.id
                ? await smartAlbumProoferSettingsService
                      .loadAlbumSettings(activeUser.id, albumId, null)
                      .catch(() => null)
                : null;
            setProofer(settings);

            if (col?.client_contact_email) {
                setRecipientEmail(String(col.client_contact_email).trim());
            }

            const albumName = col?.name || 'Album';
            const albumTpls = (await (activeUser?.id
                ? clientGalleryEmailTemplatesService.getTemplates(activeUser.id)
                : Promise.resolve([]))
            ).filter(
                (t) =>
                    t.category === 'album-sharing' ||
                    ((t.category === 'delivery-sharing' || t.category === 'collection-sharing' || t.isSystem) &&
                        t.category !== 'auto-expiry')
            );

            if (albumTpls.length > 0) {
                const defaultTpl = albumTpls.find((t) => t.category === 'album-sharing') || albumTpls[0];
                setSubject(
                    resolveTemplateBody(defaultTpl.subject || `Album proof ready — ${albumName}`, {
                        collectionName: albumName,
                    })
                );
                setBody(
                    paragraphsFromPlain(
                        resolveTemplateBody(defaultTpl.body, { collectionName: albumName })
                    )
                );
            } else {
                setSubject(`Album proof ready — ${albumName}`);
                setBody(paragraphsFromPlain(DEFAULT_ALBUM_BODY));
            }
        } catch (err) {
            console.error('Error fetching album share data:', err);
            showToast('Failed to load sharing details.');
        } finally {
            setLoading(false);
        }
    }, [albumId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowTemplateDropdown(false);
            }
            if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target)) {
                setShowMoreDropdown(false);
                setShowChooseThemeSubmenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectTemplate = (tpl) => {
        const albumName = album?.name || 'Album';
        setSubject(
            resolveTemplateBody(tpl.subject || `Album proof ready — ${albumName}`, {
                collectionName: albumName,
            })
        );
        setBody(
            paragraphsFromPlain(resolveTemplateBody(tpl.body, { collectionName: albumName }))
        );
        setShowTemplateDropdown(false);
        showToast(`Template "${tpl.name}" loaded`);
    };

    const formatHistoryRow = (item) => {
        if (!item) return null;
        const raw = String(item.status || 'Sent').trim().toLowerCase();
        let status = 'SENT';
        if (raw === 'pending' || raw === 'sending' || raw === 'queued') status = 'PENDING';
        else if (raw === 'rejected' || raw === 'bounced' || raw === 'failed' || raw === 'bounce')
            status = 'REJECTED';
        else if (raw === 'scheduled') status = 'SCHEDULED';
        else if (raw === 'sent' || raw === 'delivered') status = 'SENT';
        else status = String(item.status || 'Sent').toUpperCase();
        return {
            email: item.recipient_email,
            subject: item.subject,
            date: new Date(item.created_at || item.sent_at || Date.now()).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
            }),
            status,
        };
    };

    const loadEmailHistory = useCallback(async () => {
        if (!albumId) return;
        try {
            const data = await apiFetch(
                `/v1/proofer/studio/albums/${encodeURIComponent(albumId)}/share-history`
            );
            const rows = data?.history || [];
            if (rows.length > 0) {
                setEmailHistory(rows.map(formatHistoryRow).filter(Boolean));
            }
        } catch (err) {
            console.warn('Failed to load album email history:', err);
        }
    }, [albumId]);

    const accessPin =
        proofer?.accessLevel === 'password' ? String(proofer?.albumPassword || '').trim() : '';
    const approvalPin = String(proofer?.approvalPin || '').trim();

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!recipientEmail || !recipientEmail.includes('@')) {
            showToast('Please enter a valid email address.');
            return;
        }
        try {
            setSending(true);

            let finalMessage = body;
            let appendInfo = '';
            if (includeAccessPin && accessPin) {
                appendInfo += `<p><strong>Access PIN:</strong> ${accessPin}</p>`;
            }
            if (includeApprovalPin && approvalPin) {
                appendInfo += `<p><strong>Approval PIN:</strong> ${approvalPin}</p>`;
            }
            if (appendInfo) {
                finalMessage += `<br/><h3>Access Details</h3>${appendInfo}`;
            }

            let sendSucceeded = false;
            try {
                await apiFetch('/v1/emails/share-album', {
                    method: 'POST',
                    body: {
                        albumId,
                        recipientEmail: recipientEmail.trim(),
                        senderEmail: profile?.email || currentUser?.email,
                        personalMessage: htmlToPlainText(finalMessage),
                        subject: subject || undefined,
                    },
                });
                sendSucceeded = true;
            } catch (sendErr) {
                console.warn('Album share send failed:', sendErr?.message || sendErr);
            }

            const newHistoryItem = {
                email: recipientEmail.trim(),
                subject,
                date: new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                }),
                status: sendSucceeded ? 'SENT' : 'PENDING',
            };
            const updatedHistory = [newHistoryItem, ...emailHistory];
            setEmailHistory(updatedHistory);
            localStorage.setItem(`album_email_history_${albumId}`, JSON.stringify(updatedHistory));

            showToast(sendSucceeded ? 'Email sent successfully!' : 'Email queued — check history shortly.');
            setTimeout(() => navigate(editorPath), 1500);
        } catch (err) {
            console.error('Failed to process album email share:', err);
            showToast('Failed to process email. Please try again.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <AppLoader label="Loading share page" variant="page" />;
    }

    const shareUrl = getAlbumShareDisplayUrl(
        album,
        {
            accessLevel: proofer?.accessLevel || 'public',
            privateShareToken: proofer?.privateShareToken || '',
        },
        profile
    );
    const coverUrl = album?.cover_image_url || album?.cover_url || '';

    return (
        <div className="cs-share-shell">
            <div className="cs-top-bar">
                <div className="cs-top-bar-left">
                    <button type="button" className="cs-close-btn" onClick={() => navigate(editorPath)}>
                        <X size={18} />
                    </button>
                    <span className="cs-top-title">Share Album</span>
                </div>
                <div className="cs-top-bar-right">
                    <div className="cs-more-dropdown-wrapper" ref={moreDropdownRef}>
                        <button
                            type="button"
                            className="cs-top-link"
                            onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                        >
                            <span>More</span>
                            <ChevronDown size={14} />
                        </button>
                        {showMoreDropdown && (
                            <div className="cs-more-dropdown-menu">
                                <button
                                    type="button"
                                    className="cs-more-dropdown-item"
                                    onClick={() => {
                                        setShowHistoryModal(true);
                                        setShowMoreDropdown(false);
                                        loadEmailHistory();
                                    }}
                                >
                                    <History size={16} />
                                    <span>View email history</span>
                                </button>
                                <button
                                    type="button"
                                    className="cs-more-dropdown-item cs-more-dropdown-item--has-submenu"
                                    onClick={() => setShowChooseThemeSubmenu(!showChooseThemeSubmenu)}
                                >
                                    <Palette size={16} />
                                    <span>Choose theme</span>
                                    <ChevronRight size={14} className="ml-auto" />
                                </button>
                                {showChooseThemeSubmenu && (
                                    <div className="cs-theme-submenu">
                                        {['classic', 'night', 'heart', 'blossom'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                className="cs-theme-submenu-item"
                                                onClick={() => {
                                                    setTheme(t);
                                                    setShowChooseThemeSubmenu(false);
                                                    setShowMoreDropdown(false);
                                                }}
                                            >
                                                <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                                                {theme === t && (
                                                    <Check size={14} className="ml-auto text-teal-600" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        className="cs-top-link cs-direct-link"
                        onClick={() => navigate(`${editorPath}?share=link`)}
                    >
                        Get direct link
                    </button>
                </div>
            </div>

            <div className="cs-share-container">
                <div className="cs-composer-pane">
                    <form onSubmit={handleSend} className="cs-form">
                        <div className="cs-form-group cs-to-group">
                            <label className="cs-label">To:</label>
                            <input
                                type="email"
                                className="cs-input cs-input-borderless"
                                placeholder="client@email.com"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="cs-form-group cs-subject-group">
                            <input
                                type="text"
                                className="cs-input cs-subject-input"
                                placeholder="Album proof is ready"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                required
                            />
                        </div>

                        <div className="cs-form-group cs-body-group">
                            <RichTextEditor
                                value={body}
                                onChange={(val) => setBody(val)}
                                placeholder="Enter your text here"
                            />
                        </div>

                        <div className="cs-template-trigger-row" ref={dropdownRef}>
                            <button
                                type="button"
                                className="cs-insert-tpl-btn"
                                onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                            >
                                <Mail size={14} />
                                <span>Insert Email Template</span>
                            </button>
                            {showTemplateDropdown && (
                                <div className="cs-template-dropdown-menu">
                                    {templates.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            className="cs-template-item"
                                            onClick={() => handleSelectTemplate(t)}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                    <div className="cs-dropdown-divider" />
                                    <button
                                        type="button"
                                        className="cs-template-item cs-template-item--manage"
                                        onClick={() => navigate('/settings/email-templates')}
                                    >
                                        Manage templates
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="cs-composer-divider" />

                        <div className="cs-composer-footer-row">
                            <div className="cs-info-checkboxes">
                                <span className="cs-checkbox-group-label">Include album info:</span>
                                <div className="cs-checkbox-list">
                                    {accessPin ? (
                                        <label className="cs-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={includeAccessPin}
                                                onChange={(e) => setIncludeAccessPin(e.target.checked)}
                                            />
                                            <span>Access PIN</span>
                                        </label>
                                    ) : null}
                                    {approvalPin ? (
                                        <label className="cs-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={includeApprovalPin}
                                                onChange={(e) => setIncludeApprovalPin(e.target.checked)}
                                            />
                                            <span>Approval PIN</span>
                                        </label>
                                    ) : null}
                                    {!accessPin && !approvalPin ? (
                                        <p className="cs-no-passwords-text">No PINs set.</p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="cs-send-btn-wrapper">
                                <div className="cs-send-btn-group">
                                    <button
                                        type="submit"
                                        className="cs-send-btn"
                                        disabled={sending}
                                        style={{ borderRight: 'none' }}
                                    >
                                        {sending ? 'Sending...' : 'Send'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <div className={`cs-preview-pane cs-theme-bg-${theme}`}>
                    <div className="cs-preview-email-frame">
                        {theme === 'blossom' && (
                            <>
                                <div className="cs-blossom-decor cs-blossom-left">
                                    <svg viewBox="0 0 120 250" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10,230 C20,200 45,150 75,50" />
                                        <path d="M30,190 C15,185 10,170 12,160 C15,150 25,160 38,175 Z" />
                                        <path d="M48,140 C33,135 28,120 30,110 C33,100 43,110 54,125 Z" />
                                        <path d="M60,90 C45,85 40,70 42,60 C45,50 55,60 65,75 Z" />
                                    </svg>
                                </div>
                                <div className="cs-blossom-decor cs-blossom-right">
                                    <svg viewBox="0 0 120 250" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10,230 C20,200 45,150 75,50" />
                                        <path d="M30,190 C15,185 10,170 12,160 C15,150 25,160 38,175 Z" />
                                    </svg>
                                </div>
                            </>
                        )}
                        {theme === 'heart' && (
                            <>
                                <div className="cs-heart-decor-1" />
                                <div className="cs-heart-decor-2" />
                            </>
                        )}
                        <div className={`cs-email-card cs-theme-${theme}`}>
                            <div className="cs-email-brand-header">
                                <span className="cs-email-brand-text">
                                    {profile?.business_name || profile?.display_name || 'Studio'}
                                </span>
                            </div>

                            <div className="cs-email-hero-block">
                                <h1 className="cs-email-collection-title">{album?.name || 'Album'}</h1>
                            </div>

                            {coverUrl ? (
                                <div className="cs-email-cover-wrap">
                                    <img src={coverUrl} alt="Album cover" className="cs-email-cover" />
                                </div>
                            ) : (
                                <div className="cs-email-cover-placeholder">
                                    <span>No Cover Photo Set</span>
                                </div>
                            )}

                            <div className="cs-email-body-content">
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: body || '<p>Enter your text here...</p>',
                                    }}
                                />
                                {(includeAccessPin || includeApprovalPin) && (
                                    <div className="cs-email-access-details">
                                        <h4 className="cs-access-title">Access Details</h4>
                                        {includeAccessPin && accessPin ? (
                                            <p>
                                                <strong>Access PIN:</strong> {accessPin}
                                            </p>
                                        ) : null}
                                        {includeApprovalPin && approvalPin ? (
                                            <p>
                                                <strong>Approval PIN:</strong> {approvalPin}
                                            </p>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            <div className="cs-email-action-row">
                                <a
                                    href={shareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cs-email-button"
                                    onClick={(e) => e.preventDefault()}
                                >
                                    View Album
                                </a>
                            </div>

                            <div className="cs-email-footer">
                                <p className="cs-footer-copyright">
                                    Powered by PixNxt. &copy; {new Date().getFullYear()}{' '}
                                    {profile?.business_name || profile?.display_name || 'Photographer'}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {toastMessage ? (
                    <div className="cs-toast">
                        <Check size={16} />
                        <span>{toastMessage}</span>
                    </div>
                ) : null}
            </div>

            {showHistoryModal ? (
                <div className="cs-modal-overlay">
                    <div className="cs-modal-card" style={{ maxWidth: '780px' }}>
                        <div className="cs-modal-header">
                            <span className="cs-modal-title">EMAIL HISTORY</span>
                            <button
                                type="button"
                                className="cs-modal-close"
                                onClick={() => setShowHistoryModal(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="cs-modal-body">
                            <p style={{ margin: 0, fontSize: '13px', color: '#71717a', lineHeight: 1.5 }}>
                                Emails sent for this album will be listed here. Note that email history
                                might take up to a few minutes to show up.
                            </p>
                            <div className="cs-history-table-wrapper">
                                <table className="cs-history-table">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Subject</th>
                                            <th>Date Sent</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {emailHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} style={{ color: '#71717a' }}>
                                                    No emails sent yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            emailHistory.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.email}</td>
                                                    <td>{item.subject}</td>
                                                    <td>{item.date}</td>
                                                    <td>
                                                        <span
                                                            className={`cs-history-status-badge status-${String(
                                                                item.status
                                                            ).toLowerCase()}`}
                                                        >
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="cs-modal-footer cs-modal-footer--flat">
                            <button
                                type="button"
                                className="cs-modal-confirm-teal"
                                onClick={() => setShowHistoryModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default AlbumShare;
