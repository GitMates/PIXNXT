import React, { useCallback, useEffect, useRef, useState } from 'react';
import { mobileGalleryService } from '../../services/mobileGallery.service';
import {
  DEFAULT_APP_CTA,
  formatEventDateForInput,
  getAppCtaSettings,
} from '../../lib/mobileGalleryAppSettings';
import '../../pages/mobile-gallery/MobileGallery.css';

function SettingsToggle({ on, onChange, disabled, stateOn, stateOff }) {
  return (
    <div className="mg-app-settings-toggle-row">
      <button
        type="button"
        className={`mg-settings-toggle${on ? ' mg-settings-toggle--on' : ''}`}
        onClick={() => onChange(!on)}
        disabled={disabled}
        aria-pressed={on}
      >
        <span className="mg-settings-toggle-handle" />
      </button>
      <span className="mg-app-settings-toggle-state">{on ? stateOn : stateOff}</span>
    </div>
  );
}

function InlineSaveRow({
  id,
  type,
  value,
  placeholder,
  dirty,
  saving,
  onChange,
  onSave,
  onCancel,
}) {
  return (
    <div className="mg-app-settings-inline-row">
      <input
        id={id}
        type={type}
        className="mg-app-settings-input mg-app-settings-input--inline"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="mg-app-settings-cancel"
        onClick={onCancel}
        disabled={!dirty || saving}
      >
        Cancel
      </button>
      <button
        type="button"
        className="mg-app-settings-save"
        onClick={onSave}
        disabled={!dirty || saving}
      >
        Save
      </button>
    </div>
  );
}

const AppSettingsPanel = ({ app, photographerId, onAppUpdated }) => {
  const saveTimerRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const [name, setName] = useState(app?.name || '');
  const [eventDate, setEventDate] = useState(() => formatEventDateForInput(app?.event_date));
  const [published, setPublished] = useState(app?.status === 'published');
  const [cta, setCta] = useState(() => getAppCtaSettings(app));
  const [savedCta, setSavedCta] = useState(() => getAppCtaSettings(app));

  useEffect(() => {
    setName(app?.name || '');
    setEventDate(formatEventDateForInput(app?.event_date));
    setPublished(app?.status === 'published');
    const nextCta = getAppCtaSettings(app);
    setCta(nextCta);
    setSavedCta(nextCta);
  }, [app]);

  const showSaveToast = useCallback(() => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2800);
  }, []);

  const persist = useCallback(
    (patch, { immediate = false, showToast = true } = {}) => {
      if (!photographerId || !app?.id) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const runSave = async () => {
        setSaving(true);
        try {
          const updated = await mobileGalleryService.updateApp(photographerId, app.id, patch);
          onAppUpdated?.(updated);
          if (showToast) showSaveToast();
        } catch (err) {
          console.error('Failed to save app settings', err);
        } finally {
          setSaving(false);
        }
      };

      if (immediate) {
        runSave();
      } else {
        saveTimerRef.current = setTimeout(runSave, 500);
      }
    },
    [photographerId, app, onAppUpdated, showSaveToast]
  );

  const saveGeneral = (nextName, nextDate) => {
    persist({
      name: nextName.trim() || app.name,
      event_date: nextDate || null,
    });
  };

  const saveCtaSettings = (nextCta) => {
    const normalized = {
      cta_enabled: nextCta.cta_enabled,
      cta_label: nextCta.cta_label.trim() || DEFAULT_APP_CTA.cta_label,
      cta_url: nextCta.cta_url.trim(),
    };
    persist(
      {
        settings: {
          ...(app.settings || {}),
          ...normalized,
        },
      },
      { immediate: true }
    );
    setSavedCta(normalized);
    setCta((prev) => ({ ...prev, ...normalized }));
  };

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === app.name) return;
    saveGeneral(trimmed, eventDate || null);
  };

  const handleDateChange = (value) => {
    setEventDate(value);
    saveGeneral(name.trim() || app.name, value || null);
  };

  const handlePublishedChange = (next) => {
    setPublished(next);
    persist({ status: next ? 'published' : 'draft' }, { immediate: true });
  };

  const handleCtaEnabledChange = (next) => {
    const nextCta = { ...cta, cta_enabled: next };
    setCta(nextCta);
    saveCtaSettings(nextCta);
  };

  const labelDirty = cta.cta_label !== savedCta.cta_label;
  const urlDirty = cta.cta_url !== savedCta.cta_url;

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  return (
    <div className="mg-app-settings">
      {saving && <p className="mg-app-settings-saving" aria-live="polite">Saving…</p>}

      <div className="mg-app-settings-field">
        <label className="mg-app-settings-label" htmlFor="mg-app-name">
          App Name
        </label>
        <input
          id="mg-app-name"
          type="text"
          className="mg-app-settings-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameBlur}
        />
      </div>

      <div className="mg-app-settings-field">
        <label className="mg-app-settings-label" htmlFor="mg-app-event-date">
          Event Date
        </label>
        <input
          id="mg-app-event-date"
          type="date"
          className="mg-app-settings-input"
          value={eventDate}
          onChange={(e) => handleDateChange(e.target.value)}
        />
      </div>

      <section className="mg-app-settings-section">
        <h3 className="mg-app-settings-section-title">Status</h3>
        <SettingsToggle
          on={published}
          onChange={handlePublishedChange}
          disabled={saving}
          stateOn="Published"
          stateOff="Unpublished"
        />
        <p className="mg-app-settings-help">
          You can take the gallery app online/offline quickly. Unpublished gallery apps can only be seen by you.
        </p>
      </section>

      <section className="mg-app-settings-section">
        <h3 className="mg-app-settings-section-title">Call to Action Button</h3>
        <SettingsToggle
          on={cta.cta_enabled}
          onChange={handleCtaEnabledChange}
          disabled={saving}
          stateOn="Enabled"
          stateOff="Disabled"
        />
        <p className="mg-app-settings-help">
          Add a call-to-action button to the end of the photo section to bring your clients to other pages like the
          full gallery, your website or blog.
        </p>

        {cta.cta_enabled && (
          <div className="mg-app-settings-cta-fields">
            <div className="mg-app-settings-field">
              <label className="mg-app-settings-label" htmlFor="mg-app-cta-label">
                Button Label
              </label>
              <InlineSaveRow
                id="mg-app-cta-label"
                type="text"
                value={cta.cta_label}
                placeholder={DEFAULT_APP_CTA.cta_label}
                dirty={labelDirty}
                saving={saving}
                onChange={(value) => setCta((prev) => ({ ...prev, cta_label: value }))}
                onSave={() => saveCtaSettings(cta)}
                onCancel={() => setCta((prev) => ({ ...prev, cta_label: savedCta.cta_label }))}
              />
            </div>
            <div className="mg-app-settings-field">
              <label className="mg-app-settings-label" htmlFor="mg-app-cta-url">
                Link URL
              </label>
              <InlineSaveRow
                id="mg-app-cta-url"
                type="text"
                value={cta.cta_url}
                placeholder="https://"
                dirty={urlDirty}
                saving={saving}
                onChange={(value) => setCta((prev) => ({ ...prev, cta_url: value }))}
                onSave={() => saveCtaSettings(cta)}
                onCancel={() => setCta((prev) => ({ ...prev, cta_url: savedCta.cta_url }))}
              />
            </div>
          </div>
        )}
      </section>

      {saveToast && (
        <div className="mg-design-save-toast" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Changes successfully saved.
        </div>
      )}
    </div>
  );
};

export default AppSettingsPanel;
