import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { galleryService } from '../../services/gallery.service';
import { storageService } from '../../services/storage.service';
import { mobileGallerySettingsService } from '../../services/mobileGallerySettings.service';
import './MobileGallery.css';

const CONTACT_FIELDS = [
  { key: 'contact_show_biography', label: 'Biography' },
  { key: 'contact_show_social_links', label: 'Social Links' },
  { key: 'contact_show_contact_email', label: 'Contact Email' },
  { key: 'contact_show_phone', label: 'Phone Number' },
  { key: 'contact_show_business_address', label: 'Business Address' },
  { key: 'contact_show_website', label: 'Website' },
];

const MegaphoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="m3 11 18-5v12L3 14v-3z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
);

function SettingsCheckbox({ checked, onChange, label }) {
  return (
    <label className="mg-settings-checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="mg-settings-chk-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <span className="mg-settings-checkbox-label">{label}</span>
    </label>
  );
}

function BrandingToggle({ on, onChange, disabled }) {
  return (
    <div className="mg-settings-toggle-row">
      <button
        type="button"
        className={`mg-settings-toggle${on ? ' mg-settings-toggle--on' : ''}`}
        onClick={() => onChange(!on)}
        disabled={disabled}
        aria-pressed={on}
      >
        <span className="mg-settings-toggle-handle" />
      </button>
      <span className="mg-settings-toggle-label">{on ? 'On' : 'Off'}</span>
    </div>
  );
}

const ModuleSettings = () => {
  const { user } = useAuth();
  const logoInputRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [settings, setSettings] = useState(null);
  const [plan, setPlan] = useState('free');
  const [customDomainDraft, setCustomDomainDraft] = useState('');

  const isUpgraded = plan !== 'free';

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const [storedSettings, profile] = await Promise.all([
          mobileGallerySettingsService.getSettings(user.id),
          galleryService.getPhotographerProfile(user.id),
        ]);
        if (cancelled) return;
        setSettings(storedSettings);
        setCustomDomainDraft(storedSettings.custom_domain || '');
        setPlan(profile?.plan || 'free');
      } catch (err) {
        console.error('Failed to load Mobile Gallery settings', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persistSettings = useCallback(
    async (updates, { immediate = false } = {}) => {
      if (!user?.id) return;

      setSettings((prev) => {
        const next = { ...prev, ...updates };
        return next;
      });

      const runSave = async () => {
        setSaving(true);
        try {
          const saved = await mobileGallerySettingsService.updateSettings(user.id, updates);
          setSettings(saved);
        } catch (err) {
          console.error('Failed to save Mobile Gallery settings', err);
        } finally {
          setSaving(false);
        }
      };

      if (immediate) {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        await runSave();
        return;
      }

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(runSave, 400);
    },
    [user?.id]
  );

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    []
  );

  const handleLogoClick = () => {
    if (!isUpgraded) return;
    logoInputRef.current?.click();
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || !isUpgraded) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a PNG or image file.');
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `photographers/${user.id}/mobile-gallery/logo_${Date.now()}.${ext}`;
      const uploadResult = await storageService.upload(path, file);
      await persistSettings({ logo_url: uploadResult.url }, { immediate: true });
    } catch (err) {
      console.error('Logo upload failed', err);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async (e) => {
    e.stopPropagation();
    if (!user?.id || !isUpgraded) return;
    await persistSettings({ logo_url: '' }, { immediate: true });
  };

  const handleCustomDomainBlur = () => {
    if (!isUpgraded) return;
    const trimmed = customDomainDraft.trim();
    if (trimmed !== (settings?.custom_domain || '')) {
      persistSettings({ custom_domain: trimmed }, { immediate: true });
    }
  };

  const handleUpgrade = () => {
    window.open('/account/billing', '_self');
  };

  if (loading || !settings) {
    return (
      <div className="mg-settings-page mg-content">
        <h1>Settings</h1>
        <p className="mg-settings-loading">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mg-settings-page mg-content">
      <h1>Settings</h1>

      {/* Contact Page */}
      <section className="mg-settings-block">
        <h2 className="mg-settings-section-label">Contact Page</h2>
        <div className="mg-settings-card">
          <h3 className="mg-settings-card-title">Contact Page Info</h3>
          <p className="mg-settings-card-desc">Show the following profile info:</p>
          <div className="mg-settings-checkbox-list">
            {CONTACT_FIELDS.map(({ key, label }) => (
              <SettingsCheckbox
                key={key}
                label={label}
                checked={Boolean(settings[key])}
                onChange={(checked) => persistSettings({ [key]: checked }, { immediate: true })}
              />
            ))}
          </div>
          <p className="mg-settings-footnote">
            To update any of the above details, please go to your{' '}
            <Link to="/account/profile" className="mg-settings-link">
              Profile
            </Link>
            . Any information left blank will not appear.
          </p>
        </div>
      </section>

      {/* Domain */}
      <section className="mg-settings-block">
        <h2 className="mg-settings-section-label">Domain</h2>
        <div className="mg-settings-card">
          <h3 className="mg-settings-card-title">Custom Domain</h3>
          <div className="mg-settings-domain-row">
            <input
              type="text"
              className="mg-settings-input"
              placeholder="www.yourdomain.com"
              value={customDomainDraft}
              onChange={(e) => setCustomDomainDraft(e.target.value)}
              onBlur={handleCustomDomainBlur}
              disabled={!isUpgraded}
            />
            {!isUpgraded && (
              <button type="button" className="mg-settings-upgrade-btn" onClick={handleUpgrade}>
                Upgrade to Enable
              </button>
            )}
          </div>
          <p className="mg-settings-help">
            Use your own custom domain for your mobile gallery apps. This feature is available with an upgraded
            account.{' '}
            <button type="button" className="mg-settings-link mg-settings-link--btn" onClick={handleUpgrade}>
              Learn more
            </button>
          </p>
        </div>
      </section>

      {/* Logos & Branding */}
      <section className="mg-settings-block">
        <h2 className="mg-settings-section-label">Logos &amp; Branding</h2>

        {!isUpgraded && (
          <div className="mg-settings-upgrade-box">
            <div className="mg-settings-upgrade-box-head">
              <MegaphoneIcon />
              <div>
                <h3 className="mg-settings-upgrade-box-title">Upgrade for more brand control</h3>
                <p className="mg-settings-upgrade-box-desc">
                  Upgrade to a paid plan to create unlimited apps, add full logo and more.
                </p>
              </div>
            </div>
            <button type="button" className="mg-settings-upgrade-btn mg-settings-upgrade-btn--inline" onClick={handleUpgrade}>
              Upgrade
            </button>
          </div>
        )}

        <div className="mg-settings-card">
          <h3 className="mg-settings-card-title">Logo</h3>
          <button
            type="button"
            className={`mg-settings-logo-upload${!isUpgraded ? ' mg-settings-logo-upload--locked' : ''}`}
            onClick={handleLogoClick}
            disabled={uploadingLogo}
            aria-label={isUpgraded ? 'Upload logo' : 'Upgrade to upload logo'}
          >
            {settings.logo_url ? (
              <>
                <img src={settings.logo_url} alt="" className="mg-settings-logo-preview" />
                {isUpgraded && (
                  <span className="mg-settings-logo-remove" onClick={handleRemoveLogo} role="presentation">
                    ×
                  </span>
                )}
              </>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="mg-settings-file-input"
            onChange={handleLogoChange}
          />
          <p className="mg-settings-help">
            Logo to be used in place of the logo text and icon in the Contact Info tab and more. PNG file with
            transparent background is recommended.
          </p>

          <div className="mg-settings-branding-row">
            <h3 className="mg-settings-card-title mg-settings-card-title--inline">PIXNXT Branding</h3>
            <BrandingToggle
              on={Boolean(settings.show_pixnxt_branding)}
              onChange={(value) => persistSettings({ show_pixnxt_branding: value }, { immediate: true })}
            />
          </div>
          <p className="mg-settings-help">
            Switching this off will hide &ldquo;Powered by PIXNXT&rdquo;. Keep it on if you love us!
          </p>
        </div>
      </section>

      {saving && <p className="mg-settings-saving" aria-live="polite">Saving…</p>}
    </div>
  );
};

export default ModuleSettings;
