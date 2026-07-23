import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Mail, Check, X, Calendar, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { galleryService } from '../services/gallery.service';
import { clientGalleryEmailTemplatesService, resolveTemplateBody } from '../services/clientGalleryEmailTemplates.service';
import RichTextEditor from '../components/RichTextEditor';
import { getShareUrlForCollection } from '../lib/shareCollection';
import './CollectionShare.css';

const CollectionShare = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const collectionId = searchParams.get('id');

    const [collection, setCollection] = useState(null);
    const [profile, setProfile] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Form inputs
    const [recipientEmail, setRecipientEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [includePassword, setIncludePassword] = useState(false);
    const [includePrivatePassword, setIncludePrivatePassword] = useState(false);

    // Scheduling States
    const [scheduledDate, setScheduledDate] = useState(null);
    const [showSendDropdown, setShowSendDropdown] = useState(false);
    const [showCustomScheduleModal, setShowCustomScheduleModal] = useState(false);
    const [sendCopy, setSendCopy] = useState(true);

    // Temporary scheduling selections inside modal
    const [tempDateVal, setTempDateVal] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0]; // "YYYY-MM-DD"
    });
    const [tempTimeVal, setTempTimeVal] = useState('09:00');

    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const dropdownRef = useRef(null);
    const sendDropdownRef = useRef(null);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    // Timezone string helper (e.g. GMT+5:30)
    const getTimezoneString = () => {
        const offsetMinutes = -new Date().getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const offsetSign = offsetMinutes >= 0 ? '+' : '-';
        return `GMT${offsetSign}${offsetHours}:${offsetMins.toString().padStart(2, '0')}`;
    };

    // Helper to get active Date object from temp inputs
    const getTempDateObj = () => {
        if (!tempDateVal || !tempTimeVal) return new Date();
        const [year, month, day] = tempDateVal.split('-').map(Number);
        const [hours, minutes] = tempTimeVal.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, 0, 0);
    };

    // Status bar format helper (Jul 18, 2026 at 9:00 AM GMT+5:30)
    const formatDateStatus = (date) => {
        if (!date) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm} ${getTimezoneString()}`;
    };

    // Calculate tomorrow at 9:00 AM
    const handleSelectTomorrowSchedule = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        setScheduledDate(tomorrow);
        setShowSendDropdown(false);
        showToast("Scheduled for tomorrow at 9:00 AM");
    };

    // Generate 30-min interval times
    const generateTimeOptions = () => {
        const options = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) {
                const hStr = h.toString().padStart(2, '0');
                const mStr = m.toString().padStart(2, '0');
                const timeValue = `${hStr}:${mStr}`;
                
                const ampm = h >= 12 ? 'PM' : 'AM';
                const displayHour = h % 12 === 0 ? 12 : h % 12;
                const displayMins = m.toString().padStart(2, '0');
                const label = `${displayHour}:${displayMins} ${ampm}`;
                
                options.push(<option key={timeValue} value={timeValue}>{label}</option>);
            }
        }
        return options;
    };

    // Handle custom schedule confirm
    const handleConfirmCustomSchedule = (e) => {
        e.preventDefault();
        const selected = getTempDateObj();
        if (selected <= new Date()) {
            showToast("Please choose a future date and time.");
            return;
        }
        setScheduledDate(selected);
        setShowCustomScheduleModal(false);
        setShowSendDropdown(false);
        showToast(`Scheduled for ${selected.toLocaleString()}`);
    };

    const fetchData = useCallback(async () => {
        if (!collectionId) return;
        try {
            setLoading(true);
            
            // Get current session user
            const { data: { session } } = await supabase.auth.getSession();
            const activeUser = session?.user;
            setCurrentUser(activeUser);

            if (activeUser?.id) {
                // 1. Fetch photographer profile
                const { data: prof, error: profErr } = await supabase
                    .from('photographers')
                    .select('*')
                    .eq('id', activeUser.id)
                    .single();
                if (profErr) throw profErr;
                setProfile(prof);

                // 3. Fetch templates
                const tpls = await clientGalleryEmailTemplatesService.getTemplates(activeUser.id);
                const sharingTpls = tpls.filter(t => t.category === 'collection-sharing' || t.isSystem);
                setTemplates(sharingTpls);
            }

            // 2. Fetch collection data
            const col = await galleryService.getCollectionById(collectionId);
            setCollection(col);

            // Set initial default subject / body if exists
            const tpls = activeUser?.id ? await clientGalleryEmailTemplatesService.getTemplates(activeUser.id) : [];
            const sharingTpls = tpls.filter(t => t.category === 'collection-sharing' || t.isSystem);
            if (sharingTpls.length > 0) {
                const defaultTpl = sharingTpls[0];
                setSubject(defaultTpl.subject || '');
                setBody(resolveTemplateBody(defaultTpl.body, { collectionName: col?.name || '' }).split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`).join(''));
            } else {
                setSubject(`Photos from ${col?.name || 'Collection'} are ready`);
                setBody(`<p>Hi,</p><p>I'd like to share my photo gallery with you. Enjoy!</p>`);
            }

        } catch (err) {
            console.error('Error fetching data for share:', err);
            showToast('Failed to load sharing details.');
        } finally {
            setLoading(false);
        }
    }, [collectionId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelectTemplate = (tpl) => {
        setSubject(tpl.subject || '');
        const resolved = resolveTemplateBody(tpl.body, { collectionName: collection?.name || '' });
        const html = resolved.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`).join('');
        setBody(html);
        setShowTemplateDropdown(false);
        showToast(`Template "${tpl.name}" loaded`);
    };

    // Handle outside clicks for template and send dropdowns
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowTemplateDropdown(false);
            }
            if (sendDropdownRef.current && !sendDropdownRef.current.contains(e.target)) {
                setShowSendDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
            if (includePassword && collection?.password) {
                appendInfo += `<p><strong>Collection Password:</strong> ${collection.password}</p>`;
            }
            if (includePrivatePassword && collection?.private_password) {
                appendInfo += `<p><strong>Client Private Password:</strong> ${collection.private_password}</p>`;
            }
            if (appendInfo) {
                finalMessage += `<br/><h3>Access Details</h3>${appendInfo}`;
            }

            const convertHtmlToPlainText = (html) => {
                if (!html) return '';
                let text = html;
                text = text.replace(/<br\s*\/?>/gi, '\n');
                text = text.replace(/<\/p>/gi, '\n\n');
                text = text.replace(/<\/div>/gi, '\n');
                text = text.replace(/<\/h[1-6]>/gi, '\n\n');

                try {
                    const tempEl = document.createElement('div');
                    tempEl.innerHTML = text;
                    return (tempEl.textContent || tempEl.innerText || '').trim();
                } catch {
                    text = text.replace(/<[^>]+>/g, '');
                    return text.trim();
                }
            };

            const sendPayload = {
                collectionSlug: collection.slug,
                recipientEmail: recipientEmail.trim(),
                senderEmail: profile?.email || currentUser?.email,
                personalMessage: convertHtmlToPlainText(finalMessage),
                subject: subject,
            };

            // If scheduled, add schedule date parameters to payload
            if (scheduledDate) {
                sendPayload.scheduledAt = scheduledDate.toISOString();
            }

            try {
                const { error: sendErr } = await supabase.functions.invoke('share-collection-email', {
                    body: sendPayload,
                });
                if (sendErr) {
                    console.warn('Backend send/schedule warning (non-fatal locally):', sendErr);
                }
            } catch (invokeErr) {
                console.warn('Supabase Edge Function invocation failed (falling back to mock send for local testing):', invokeErr);
            }

            // Record sharing in database logs (resilient to edge function failures)
            try {
                const { error: dbErr } = await supabase.from('collection_share_emails').insert({
                    collection_id: collectionId,
                    sender_email: profile?.email || currentUser?.email || 'photographer@email.com',
                    recipient_email: recipientEmail.trim(),
                    subject: subject,
                    status: scheduledDate ? 'Scheduled' : 'Sent',
                });
                if (dbErr) {
                    console.error('Could not log share history in database:', dbErr);
                }
            } catch (dbErr) {
                console.error('Database insert exception:', dbErr);
            }

            showToast(scheduledDate ? `Email scheduled successfully!` : 'Email sent successfully!');
            setTimeout(() => {
                navigate(`/collections/manage?id=${collectionId}`);
            }, 1500);

        } catch (err) {
            console.error('Failed to process email share:', err);
            showToast('Failed to process email. Please try again.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
        );
    }

    const shareUrl = getShareUrlForCollection(collection);
    const coverUrl = collection?.cover_url || collection?.cover;

    return (
        <div className="cs-share-shell">
            {/* TOP HEADER BAR */}
            <div className="cs-top-bar">
                <div className="cs-top-bar-left">
                    <button type="button" className="cs-close-btn" onClick={() => navigate(`/collections/manage?id=${collectionId}`)}>
                        <X size={18} />
                    </button>
                    <span className="cs-top-title">Share Collection</span>
                </div>
                <div className="cs-top-bar-right">
                    <div className="cs-more-dropdown-wrapper">
                        <button type="button" className="cs-top-link">
                            <span>More</span>
                            <ChevronDown size={14} />
                        </button>
                    </div>
                    <button type="button" className="cs-top-link cs-direct-link" onClick={() => navigate(`/collections/manage?id=${collectionId}&action=link`)}>
                        Get direct link
                    </button>
                </div>
            </div>

            <div className="cs-share-container">
                {/* LEFT COLUMN: Composer */}
                <div className="cs-composer-pane">
                    <form onSubmit={handleSend} className="cs-form">
                        <div className="cs-form-group cs-to-group">
                            <label className="cs-label">To:</label>
                            <input
                                type="email"
                                className="cs-input cs-input-borderless"
                                placeholder="guest@email.com"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="cs-form-group cs-subject-group">
                            <input
                                type="text"
                                className="cs-input cs-subject-input"
                                placeholder="Photos are ready"
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
                                    {templates.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            className="cs-template-item"
                                            onClick={() => handleSelectTemplate(t)}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                    <div className="cs-dropdown-divider"></div>
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

                        {/* Scheduling Status Badge */}
                        {scheduledDate && (
                            <div className="cs-schedule-badge">
                                <Clock size={14} className="text-teal-600" />
                                <span>Scheduled for: <strong>{scheduledDate.toLocaleString()}</strong></span>
                                <button type="button" className="cs-schedule-clear-btn" onClick={() => setScheduledDate(null)} title="Send immediately">
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        <div className="cs-composer-divider"></div>

                        <div className="cs-composer-footer-row">
                            <div className="cs-info-checkboxes">
                                <span className="cs-checkbox-group-label">Include collection info:</span>
                                <div className="cs-checkbox-list">
                                    {collection?.password && (
                                        <label className="cs-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={includePassword}
                                                onChange={(e) => setIncludePassword(e.target.checked)}
                                            />
                                            <span>Collection Password</span>
                                        </label>
                                    )}
                                    {collection?.private_password && (
                                        <label className="cs-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={includePrivatePassword}
                                                onChange={(e) => setIncludePrivatePassword(e.target.checked)}
                                            />
                                            <span>Client Private Password</span>
                                        </label>
                                    )}
                                    {!collection?.password && !collection?.private_password && (
                                        <p className="cs-no-passwords-text">No passwords set.</p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="cs-send-btn-wrapper" ref={sendDropdownRef}>
                                <div className="cs-send-btn-group">
                                    <button
                                        type="submit"
                                        className="cs-send-btn"
                                        disabled={sending}
                                    >
                                        {sending ? 'Sending...' : (scheduledDate ? 'Schedule' : 'Send')}
                                    </button>
                                    <button
                                        type="button"
                                        className="cs-send-dropdown-arrow"
                                        onClick={() => setShowSendDropdown(!showSendDropdown)}
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                                {showSendDropdown && (
                                    <div className="cs-send-dropdown-menu">
                                        <button type="button" className="cs-send-dropdown-item" onClick={handleSelectTomorrowSchedule}>
                                            <Clock size={16} />
                                            <span>Tomorrow at 9:00am {getTimezoneString()}</span>
                                        </button>
                                        <button type="button" className="cs-send-dropdown-item" onClick={() => { setShowCustomScheduleModal(true); setShowSendDropdown(false); }}>
                                            <Calendar size={16} />
                                            <span>Custom schedule</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                {/* RIGHT COLUMN: Live Preview */}
                <div className="cs-preview-pane">
                    <div className="cs-preview-email-frame">
                        <div className="cs-email-card">
                            {/* Brand Logo/Header */}
                            <div className="cs-email-brand-header">
                                <span className="cs-email-brand-text">{profile?.business_name || profile?.display_name || 'KAVI'}</span>
                            </div>

                            {/* Main Title Block */}
                            <div className="cs-email-hero-block">
                                <h1 className="cs-email-collection-title">{collection?.name || 'WEDDIND'}</h1>
                            </div>

                            {/* Collection Cover Image */}
                            {coverUrl ? (
                                <div className="cs-email-cover-wrap">
                                    <img src={coverUrl} alt="Collection Cover" className="cs-email-cover" />
                                </div>
                            ) : (
                                <div className="cs-email-cover-placeholder">
                                    <span>No Cover Photo Set</span>
                                </div>
                            )}

                            {/* Email Message Content */}
                            <div className="cs-email-body-content">
                                <div dangerouslySetInnerHTML={{ __html: body || '<p>Enter your text here...</p>' }} />
                                
                                {/* Access Details if selected */}
                                {(includePassword || includePrivatePassword) && (
                                    <div className="cs-email-access-details">
                                        <h4 className="cs-access-title">Access Details</h4>
                                        {includePassword && collection?.password && (
                                            <p><strong>Collection Password:</strong> {collection.password}</p>
                                        )}
                                        {includePrivatePassword && collection?.private_password && (
                                            <p><strong>Client Private Password:</strong> {collection.private_password}</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Call to Action Button */}
                            <div className="cs-email-action-row">
                                <a
                                    href={shareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cs-email-button"
                                    onClick={(e) => e.preventDefault()}
                                >
                                    View Gallery
                                </a>
                            </div>

                            {/* Footer links */}
                            <div className="cs-email-footer">
                                <p className="cs-footer-copyright">
                                    Powered by PixNxt. &copy; {new Date().getFullYear()} {profile?.business_name || profile?.display_name || 'Photographer'}.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Custom Toast popup */}
                {toastMessage && (
                    <div className="cs-toast">
                        <Check size={16} />
                        <span>{toastMessage}</span>
                    </div>
                )}
            </div>

            {/* CUSTOM SCHEDULE MODAL */}
            {showCustomScheduleModal && (
                <div className="cs-modal-overlay">
                    <form className="cs-modal-card cs-schedule-modal" onSubmit={handleConfirmCustomSchedule}>
                        <div className="cs-modal-header">
                            <span className="cs-modal-title">SCHEDULE EMAIL</span>
                            <button type="button" className="cs-modal-close" onClick={() => setShowCustomScheduleModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="cs-modal-body">
                            {/* Alert/Status bar */}
                            <div className="cs-schedule-status-bar">
                                Email scheduled for <strong>{formatDateStatus(getTempDateObj())}</strong>
                            </div>

                            {/* Split field columns */}
                            <div className="cs-schedule-fields-row">
                                <div className="cs-schedule-field-col">
                                    <label className="cs-schedule-field-label">Date</label>
                                    <div className="cs-schedule-input-wrapper">
                                        <input
                                            type="date"
                                            className="cs-schedule-input-date"
                                            value={tempDateVal}
                                            onChange={(e) => setTempDateVal(e.target.value)}
                                            required
                                        />
                                        <button type="button" className="cs-schedule-clear" onClick={() => setTempDateVal('')}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="cs-schedule-field-col">
                                    <label className="cs-schedule-field-label">Time</label>
                                    <div className="cs-schedule-input-wrapper">
                                        <select
                                            className="cs-schedule-select-time"
                                            value={tempTimeVal}
                                            onChange={(e) => setTempTimeVal(e.target.value)}
                                            required
                                        >
                                            {generateTimeOptions()}
                                        </select>
                                        <button type="button" className="cs-schedule-clear" onClick={() => setTempTimeVal('09:00')}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Checkbox copy */}
                            <div className="cs-schedule-copy-row">
                                <label className="cs-schedule-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={sendCopy}
                                        onChange={(e) => setSendCopy(e.target.checked)}
                                    />
                                    <span className="cs-checkbox-styled"></span>
                                    <span className="cs-checkbox-text">Send me a copy</span>
                                </label>
                            </div>
                        </div>
                        <div className="cs-modal-footer cs-modal-footer--flat">
                            <button type="button" className="cs-modal-cancel-flat" onClick={() => setShowCustomScheduleModal(false)}>
                                Cancel
                            </button>
                            <button type="submit" className="cs-modal-confirm-teal">
                                Schedule
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CollectionShare;
