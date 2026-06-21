import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  mobileGalleryEmailTemplatesService,
  resolveTemplateBody,
  resolveTemplateSubject,
} from '../../services/mobileGalleryEmailTemplates.service';
import '../../pages/mobile-gallery/MobileGallery.css';

function ManageEmailTemplatesModal({
  photographerId,
  appName,
  senderName,
  initialTemplateId,
  onClose,
  onTemplatesChange,
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectTemplate = useCallback((id, list) => {
    const t = (list || templates).find((item) => item.id === id);
    if (!t) return;
    setSelectedId(id);
    setDraftName(t.name);
    setDraftSubject(t.subject || '');
    setDraftBody(t.body || '');
  }, [templates]);

  const loadTemplates = useCallback(async () => {
    if (!photographerId) return [];
    setLoading(true);
    try {
      const list = await mobileGalleryEmailTemplatesService.getTemplates(photographerId);
      setTemplates(list);
      return list;
    } finally {
      setLoading(false);
    }
  }, [photographerId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadTemplates();
      if (cancelled) return;
      const pick = initialTemplateId && list.find((t) => t.id === initialTemplateId)
        ? initialTemplateId
        : list[0]?.id;
      if (pick) selectTemplate(pick, list);
    })();
    return () => {
      cancelled = true;
    };
  }, [photographerId, initialTemplateId, loadTemplates, selectTemplate]);

  const handleNewTemplate = async () => {
    const created = await mobileGalleryEmailTemplatesService.createTemplate(photographerId);
    const list = await loadTemplates();
    selectTemplate(created.id, list);
    onTemplatesChange?.(list);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await mobileGalleryEmailTemplatesService.saveTemplate(photographerId, {
        id: selectedId,
        name: draftName,
        subject: draftSubject,
        body: draftBody,
      });
      const list = await loadTemplates();
      onTemplatesChange?.(list);
    } finally {
      setSaving(false);
    }
  };

  const previewSubject = resolveTemplateSubject(draftSubject, { appName });

  return (
    <div className="mg-share-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="mg-email-templates-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Manage email templates"
      >
        <div className="mg-email-templates-header">
          <h2>Manage Email Templates</h2>
          <button type="button" className="mg-share-modal-close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mg-email-templates-body">
          <aside className="mg-email-templates-sidebar">
            <ul className="mg-email-templates-list">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`mg-email-templates-list-item${selectedId === t.id ? ' mg-email-templates-list-item--active' : ''}`}
                    onClick={() => selectTemplate(t.id)}
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="mg-email-templates-new" onClick={handleNewTemplate}>
              + New Template
            </button>
          </aside>

          <div className="mg-email-templates-editor">
            {loading ? (
              <p className="mg-loading">Loading templates…</p>
            ) : (
              <>
                <label className="mg-share-field">
                  <input
                    type="text"
                    className="mg-email-templates-name-input"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Template name"
                  />
                </label>
                <label className="mg-share-field">
                  <span className="mg-share-label">Subject</span>
                  <input
                    type="text"
                    className="mg-share-input"
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                  />
                </label>
                <textarea
                  className="mg-share-textarea mg-email-templates-body-input"
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                />
                <p className="mg-email-templates-preview-hint">
                  Preview: <strong>{previewSubject || '(no subject)'}</strong>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mg-email-templates-footer">
          <button type="button" className="mg-btn-primary" onClick={handleSave} disabled={saving || !selectedId || loading}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmailTemplateInsertMenu({
  photographerId,
  appName,
  senderName,
  onInsert,
  onManage,
  onCreate,
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const wrapRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!photographerId) return;
    const list = await mobileGalleryEmailTemplatesService.getTemplates(photographerId);
    setTemplates(list);
  }, [photographerId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handlePick = (template) => {
    const subject = resolveTemplateSubject(template.subject, { appName });
    const body = resolveTemplateBody(template.body, { appName, senderName });
    onInsert({ subject, body, templateId: template.id });
    setOpen(false);
  };

  return (
    <div className="mg-email-template-insert" ref={wrapRef}>
      <button
        type="button"
        className="mg-share-template-insert"
        onClick={() => {
          refresh();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Insert Email Template
      </button>

      {open && (
        <div className="mg-email-template-menu" role="menu">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              className="mg-email-template-menu-item"
              role="menuitem"
              onClick={() => handlePick(t)}
            >
              {t.name}
            </button>
          ))}
          <div className="mg-email-template-menu-footer">
            <button
              type="button"
              className="mg-email-template-menu-link"
              onClick={() => {
                setOpen(false);
                onManage();
              }}
            >
              Manage templates
            </button>
            <button
              type="button"
              className="mg-email-template-menu-link"
              onClick={() => {
                setOpen(false);
                onCreate();
              }}
            >
              Create new
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { EmailTemplateInsertMenu, ManageEmailTemplatesModal };
