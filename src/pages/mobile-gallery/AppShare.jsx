import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { galleryService } from '../../services/gallery.service';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import { mobileGalleryEmailTemplatesService } from '../../services/mobileGalleryEmailTemplates.service';
import { getPreviewWebsiteLink } from '../../lib/mobileGalleryPreviewFormat';
import { getPublicSiteOrigin, getShareUrlWarning } from '../../lib/publicSiteUrl';
import { mobileGalleryShareService } from '../../services/mobileGalleryShare.service';
import { isLocalOrigin, isValidInstallLink } from '../../lib/mobileGalleryInstall';
import {
  getAppDirectLink,
  getDefaultInviteMessage,
  getDefaultInviteSubject,
} from '../../lib/mobileGalleryShare';
import {
  EmailTemplateInsertMenu,
  ManageEmailTemplatesModal,
} from '../../components/mobile-gallery/EmailTemplateModals';
import MobileGalleryLayout from '../../components/mobile-gallery/MobileGalleryLayout';
import './MobileGallery.css';

function IconMegaphone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ShareModal({ title, onClose, children }) {
  return (
    <div className="mg-share-modal-overlay" onClick={onClose} role="presentation">
      <div className="mg-share-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="mg-share-modal-header">
          <h2>{title}</h2>
          <button type="button" className="mg-share-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EmailPreviewPanel({ app, message, websiteLink, directLink, iconUrl }) {
  const appName = app?.name || 'Gallery';
  const displayName = appName.toUpperCase();

  return (
    <div className="mg-share-email-preview">
      <div className="mg-share-email-preview-inner">
        <p className="mg-share-email-preview-brand">{displayName}</p>
        <h3 className="mg-share-email-preview-title">Your Mobile Gallery App is Ready</h3>
        <div className="mg-share-email-preview-icon">
          {iconUrl ? (
            <img src={iconUrl} alt="" />
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.2" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>{displayName}</span>
            </>
          )}
        </div>
        <div className="mg-share-email-preview-body">
          {message.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < message.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
        <a href={directLink} className="mg-share-email-preview-install" target="_blank" rel="noopener noreferrer">
          Install App
        </a>
        <div className="mg-share-email-preview-footer">
          <p>{appName}</p>
          {websiteLink && (
            <a href={websiteLink.href} target="_blank" rel="noopener noreferrer">
              {websiteLink.label}
            </a>
          )}
          <p className="mg-share-email-preview-reply">Questions? Reply to this email.</p>
        </div>
      </div>
    </div>
  );
}

const AppShare = () => {
  const { appId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [app, setApp] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendCopy, setSendCopy] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

  const [showSocial, setShowSocial] = useState(false);
  const [showDirectLink, setShowDirectLink] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sendSuccess, setSendSuccess] = useState(null);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const [manageTemplatesFocusId, setManageTemplatesFocusId] = useState(null);
  const [copyDone, setCopyDone] = useState(false);

  const senderName = useMemo(() => {
    if (profile?.business_name) return profile.business_name;
    if (profile?.first_name) return `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`;
    return app?.name || 'Your photographer';
  }, [profile, app]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [appData, profileData] = await Promise.all([
          mobileGalleryService.getApp(user.id, appId),
          galleryService.getPhotographerProfile(user.id),
        ]);
        if (cancelled) return;
        setApp(appData);
        setProfile(profileData);
        const appName = appData?.name || 'gallery';
        const sender =
          profileData?.business_name ||
          [profileData?.first_name, profileData?.last_name].filter(Boolean).join(' ') ||
          appName;
        setSubject(getDefaultInviteSubject(appName, sender));
        setMessage(getDefaultInviteMessage(appName, sender));
      } catch (err) {
        console.error(err);
        if (!cancelled) setApp(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, appId]);

  const directLink = useMemo(
    () => (app?.slug ? getAppDirectLink(app.slug, getPublicSiteOrigin()) : ''),
    [app?.slug]
  );
  const installLinkWarning = useMemo(() => {
    if (!app?.slug) return 'Publish this app to generate an install link.';
    if (!directLink || !isValidInstallLink(directLink)) {
      return (
        getShareUrlWarning(directLink) ||
        'Set VITE_PUBLIC_SITE_URL to your live domain (e.g. https://pixnxt.com) so install links work in emails.'
      );
    }
    if (isLocalOrigin(getPublicSiteOrigin())) {
      return 'This install link uses localhost and will not work for clients.';
    }
    return null;
  }, [app?.slug, directLink]);
  const websiteLink = useMemo(
    () => (profile ? getPreviewWebsiteLink(profile, user) : null),
    [profile, user]
  );
  const iconUrl = app?.icon_url || app?.cover_image_url || null;

  const handleInsertTemplate = ({ subject: nextSubject, body, templateId }) => {
    setSubject(nextSubject);
    setMessage(body);
    setSelectedTemplateId(templateId);
  };

  const openManageTemplates = (focusId = null) => {
    setManageTemplatesFocusId(focusId);
    setShowManageTemplates(true);
  };

  const openCreateTemplate = async () => {
    if (!user?.id) return;
    const created = await mobileGalleryEmailTemplatesService.createTemplate(user.id);
    setManageTemplatesFocusId(created.id);
    setShowManageTemplates(true);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directLink);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      window.prompt('Copy this link:', directLink);
    }
  };

  const openMailtoFallback = () => {
    const to = recipientEmail.trim();
    const mailSubject = encodeURIComponent(subject);
    const bodyText = `${message}\n\nInstall your app here:\n${directLink}`;
    const mailBody = encodeURIComponent(bodyText);
    let mailto = `mailto:${encodeURIComponent(to)}?subject=${mailSubject}&body=${mailBody}`;
    if (sendCopy && user?.email) {
      mailto += `&bcc=${encodeURIComponent(user.email)}`;
    }
    window.location.href = mailto;
  };

  const handleSendInvite = () => {
    if (!recipientEmail.trim()) {
      alert('Please enter a recipient email address.');
      return;
    }
    setSendError(null);
    setSendSuccess(null);
    setShowSendConfirm(true);
  };

  const confirmSendInvite = async () => {
    if (!user?.id || !appId) return;

    setSending(true);
    setSendError(null);

    try {
      const data = await mobileGalleryShareService.sendInvite({
        appId,
        recipientEmail,
        subject,
        message,
        sendCopy,
        websiteLink,
      });
      setShowSendConfirm(false);
      setSendSuccess(
        data?.directLink
          ? `Invite sent to ${recipientEmail.trim()}. Install link: ${data.directLink}`
          : `Invite sent to ${recipientEmail.trim()}`
      );
      setRecipientEmail('');
    } catch (err) {
      console.error(err);
      if (err?.code === 'SMTP_NOT_CONFIGURED') {
        setSendError(
          'Server email is not configured yet. You can open your email app instead, or ask your admin to set SMTP secrets on Supabase.'
        );
      } else {
        setSendError(err?.message || 'Failed to send invite. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  const openSocialShare = (platform) => {
    const encodedUrl = encodeURIComponent(directLink);
    const text = encodeURIComponent(`Check out ${app?.name || 'my gallery'} mobile app!`);
    const urls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${text}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${text}`,
    };
    window.open(urls[platform], '_blank', 'noopener,noreferrer,width=600,height=500');
    setShowSocial(false);
  };

  if (loading) {
    return (
      <MobileGalleryLayout>
        <p className="mg-loading">Loading…</p>
      </MobileGalleryLayout>
    );
  }

  if (!app) {
    return (
      <MobileGalleryLayout>
        <div className="mg-content">
          <div className="mg-empty">
            <h2>App not found</h2>
            <button type="button" className="mg-btn-primary" onClick={() => navigate('/mobile-gallery')}>
              Back to Apps
            </button>
          </div>
        </div>
      </MobileGalleryLayout>
    );
  }

  return (
    <MobileGalleryLayout>
      <div className="mg-share-page">
        <div className="mg-share-subheader mg-content mg-content--wide">
          <button type="button" className="mg-share-back" onClick={() => navigate(`/mobile-gallery/app/${appId}`)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to {app.name}
          </button>
          <div className="mg-share-subheader-actions">
            <button type="button" className="mg-share-action-btn" onClick={() => setShowSocial(true)}>
              <IconMegaphone />
              Social
            </button>
            <button type="button" className="mg-share-action-btn" onClick={() => setShowDirectLink(true)}>
              <IconLink />
              Get Direct Link
            </button>
          </div>
        </div>

      {app.status !== 'published' && (
        <p className="mg-share-status mg-share-status--error" role="alert">
          Publish this app before sharing — clients can only install published galleries.
        </p>
      )}

      {installLinkWarning && app.status === 'published' && (
        <p className="mg-share-status mg-share-status--error" role="alert">
          {installLinkWarning}
        </p>
      )}

        <div className="mg-share-layout mg-content mg-content--wide">
          {sendSuccess && (
            <p className="mg-share-status mg-share-status--success" role="status">
              {sendSuccess}
            </p>
          )}
          {sendError && !showSendConfirm && (
            <p className="mg-share-status mg-share-status--error" role="alert">
              {sendError}
              <button type="button" className="mg-share-mailto-fallback" onClick={openMailtoFallback}>
                Open in email app
              </button>
            </p>
          )}
          <div className="mg-share-form-panel">
            <label className="mg-share-field">
              <span className="mg-share-label">Email</span>
              <input
                type="email"
                className="mg-share-input"
                placeholder="e.g. johnsmith@email.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </label>

            <label className="mg-share-field">
              <span className="mg-share-label">Subject</span>
              <input
                type="text"
                className="mg-share-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <label className="mg-share-field mg-share-field--grow">
              <textarea
                className="mg-share-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
              />
            </label>

            <div className="mg-share-form-footer">
              <div className="mg-share-template-wrap">
                {user?.id && (
                  <EmailTemplateInsertMenu
                    photographerId={user.id}
                    appName={app.name}
                    senderName={senderName}
                    onInsert={handleInsertTemplate}
                    onManage={() => openManageTemplates(selectedTemplateId)}
                    onCreate={openCreateTemplate}
                  />
                )}
              </div>

              <div className="mg-share-send-row">
                <label className="mg-share-copy-check">
                  <input
                    type="checkbox"
                    checked={sendCopy}
                    onChange={(e) => setSendCopy(e.target.checked)}
                  />
                  Send me a copy
                </label>
                <button
                  type="button"
                  className="mg-btn-primary mg-share-send-btn"
                  onClick={handleSendInvite}
                  disabled={sending}
                >
                  <IconSend />
                  {sending ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>

          <EmailPreviewPanel
            app={app}
            message={message}
            websiteLink={websiteLink}
            directLink={directLink}
            iconUrl={iconUrl}
          />
        </div>
      </div>

      {showSocial && (
        <ShareModal title="Share to Social Media" onClose={() => setShowSocial(false)}>
          <div className="mg-share-social-grid">
            <button type="button" className="mg-share-social-btn mg-share-social-btn--facebook" onClick={() => openSocialShare('facebook')} aria-label="Share on Facebook">
              f
            </button>
            <button type="button" className="mg-share-social-btn mg-share-social-btn--twitter" onClick={() => openSocialShare('twitter')} aria-label="Share on X">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
            <button type="button" className="mg-share-social-btn mg-share-social-btn--pinterest" onClick={() => openSocialShare('pinterest')} aria-label="Share on Pinterest">
              P
            </button>
          </div>
        </ShareModal>
      )}

      {showDirectLink && (
        <ShareModal title="Get Direct Link" onClose={() => setShowDirectLink(false)}>
          <div className="mg-share-direct-link">
            <label className="mg-share-label">URL</label>
            <div className="mg-share-url-row">
              <IconLink />
              <input type="text" className="mg-share-url-input" value={directLink} readOnly />
              <button type="button" className="mg-share-copy-btn" onClick={handleCopyLink}>
                {copyDone ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mg-share-direct-hint">Share this unique URL for this gallery app with your client.</p>
          </div>
        </ShareModal>
      )}

      {showSendConfirm && (
        <ShareModal title="Send Invite" onClose={() => !sending && setShowSendConfirm(false)}>
          <p className="mg-share-confirm-text">
            Send this invite to <strong>{recipientEmail.trim()}</strong>?
          </p>
          {sendError && (
            <p className="mg-share-status mg-share-status--error" role="alert">
              {sendError}
            </p>
          )}
          <div className="mg-share-confirm-actions">
            <button
              type="button"
              className="mg-share-confirm-cancel"
              onClick={() => setShowSendConfirm(false)}
              disabled={sending}
            >
              Cancel
            </button>
            {sendError?.includes('not configured') ? (
              <button type="button" className="mg-btn-primary" onClick={openMailtoFallback}>
                Open in email app
              </button>
            ) : (
              <button type="button" className="mg-btn-primary" onClick={confirmSendInvite} disabled={sending}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            )}
          </div>
        </ShareModal>
      )}

      {showManageTemplates && user?.id && (
        <ManageEmailTemplatesModal
          photographerId={user.id}
          appName={app.name}
          senderName={senderName}
          initialTemplateId={manageTemplatesFocusId}
          onClose={() => setShowManageTemplates(false)}
          onTemplatesChange={() => {}}
        />
      )}
    </MobileGalleryLayout>
  );
};

export default AppShare;
