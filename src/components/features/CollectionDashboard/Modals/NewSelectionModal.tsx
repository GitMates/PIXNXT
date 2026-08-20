import React from 'react';
import { getSelectionChooseUrl } from '../../../../lib/shareCollection';
import './NewSelectionModal.css';

export type SelectionTemplateId = 'album' | 'retouch' | 'parents' | 'blank';

export type NewSelectionPayload = {
  name: string;
  email: string;
  maxSelection: number | null;
  description: string | null;
  message: string;
  chooseUrl: string;
};

const TEMPLATES: {
  id: SelectionTemplateId;
  name: string;
  meta: string;
  count: number | null;
  description: string | null;
}[] = [
  { id: 'album', name: 'Album', meta: '60 photographs', count: 60, description: 'for the printed book.' },
  { id: 'retouch', name: 'Retouch', meta: '15 photographs', count: 15, description: 'close skin work.' },
  { id: 'parents', name: "Parents' set", meta: '30 photographs', count: 30, description: 'for both families.' },
  { id: 'blank', name: 'Blank', meta: 'name it yourself', count: null, description: null },
];

function firstNameFromEmail(email: string) {
  const raw = String(email || '').split('@')[0] || '';
  const cleaned = raw.replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function maskEmailStars(email?: string | null) {
  const raw = String(email || '').trim();
  if (!raw.includes('@')) return raw;
  const [name, domain] = raw.split('@');
  const tld = domain.includes('.') ? domain.slice(domain.indexOf('.')) : '';
  return `${name}@****${tld}`;
}

function defaultMessage({
  email,
  name,
  count,
  chooseDisplayPath,
  studioName,
}: {
  email: string;
  name: string;
  count: number | null;
  chooseDisplayPath: string;
  studioName: string;
}) {
  const greeting = firstNameFromEmail(email);
  const howMany = count ? String(count) : 'photographs';
  const listName = name.trim() || 'this selection';
  const lines = [
    greeting ? `Hello ${greeting},` : 'Hello,',
    '',
    `Please choose ${howMany} for the ${listName.toLowerCase()}.`,
    chooseDisplayPath,
    '',
    `— ${studioName}`,
  ];
  return lines.join('\n');
}

function MessagePreview({
  email,
  name,
  count,
  chooseDisplayPath,
  studioName,
}: {
  email: string;
  name: string;
  count: number | null;
  chooseDisplayPath: string;
  studioName: string;
}) {
  const greeting = firstNameFromEmail(email);
  const howMany = count ? String(count) : 'photographs';
  const listName = name.trim() || 'this selection';

  return (
    <div className="nsel-preview-box" aria-live="polite">
      <p className="nsel-preview-line">{greeting ? `Hello ${greeting},` : 'Hello,'}</p>
      <p className="nsel-preview-line">
        Please choose <strong>{howMany}</strong> for the {listName.toLowerCase()}.
      </p>
      {chooseDisplayPath ? (
        <p className="nsel-preview-line">
          <span className="nsel-preview-link">{chooseDisplayPath}</span>
        </p>
      ) : null}
      <p className="nsel-preview-line nsel-preview-signoff">— {studioName}</p>
    </div>
  );
}

export function NewSelectionModal({
  isOpen,
  onClose,
  onSubmit,
  onRevokeAccess,
  editingList,
  collectionSlug,
  profile,
  studioName,
  saving,
  revoking,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: NewSelectionPayload, options: { send: boolean }) => Promise<void> | void;
  onRevokeAccess?: (list: {
    id: string;
    name?: string;
    submitted_at?: string | null;
  }) => void | Promise<void>;
  editingList?: {
    id: string;
    name?: string;
    email?: string | null;
    max_selection?: number | null;
    description?: string | null;
    submitted_at?: string | null;
  } | null;
  collectionSlug: string;
  profile?: Record<string, unknown> | null;
  studioName: string;
  saving?: boolean;
  revoking?: boolean;
}) {
  const isEdit = Boolean(editingList?.id);
  const isLocked = Boolean(editingList?.submitted_at);
  const [template, setTemplate] = React.useState<SelectionTemplateId>('album');
  const [name, setName] = React.useState('Album');
  const [count, setCount] = React.useState('60');
  const [email, setEmail] = React.useState('');
  const [emailFocused, setEmailFocused] = React.useState(false);
  const [description, setDescription] = React.useState<string | null>(TEMPLATES[0].description);

  const choose = getSelectionChooseUrl(collectionSlug, profile);
  const chooseDisplayPath = choose.displayPath;
  const chooseHref = choose.href;

  React.useEffect(() => {
    if (!isOpen) return;
    setEmailFocused(false);
    if (editingList?.id) {
      setTemplate('blank');
      setName(editingList.name || '');
      setCount(editingList.max_selection ? String(editingList.max_selection) : '');
      setEmail(editingList.email || '');
      setDescription(editingList.description || null);
      return;
    }
    const starter = TEMPLATES[0];
    setTemplate(starter.id);
    setName(starter.name);
    setCount(starter.count ? String(starter.count) : '');
    setEmail('');
    setDescription(starter.description);
  }, [isOpen, editingList]);

  const parsedCount = (() => {
    const raw = String(count || '').trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n);
  })();

  const message = defaultMessage({
    email,
    name,
    count: parsedCount,
    chooseDisplayPath,
    studioName,
  });

  const applyTemplate = (id: SelectionTemplateId) => {
    const next = TEMPLATES.find((item) => item.id === id);
    if (!next) return;
    setTemplate(id);
    if (id === 'blank') {
      setName('');
      setCount('');
      setDescription(null);
    } else {
      setName(next.name);
      setCount(next.count ? String(next.count) : '');
      setDescription(next.description);
    }
  };

  const canSave = Boolean(name.trim() && email.trim().includes('@') && !saving);

  const submit = async (send: boolean) => {
    if (!canSave) return;
    await onSubmit(
      {
        name: name.trim(),
        email: email.trim(),
        maxSelection: parsedCount,
        description,
        message,
        chooseUrl: chooseHref,
      },
      { send },
    );
  };

  if (!isOpen) return null;

  return (
    <div className="nsel-overlay" onClick={onClose} role="presentation">
      <div
        className="nsel-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-labelledby="nsel-title"
      >
        <div className="nsel-head">
          <div>
            <h3 id="nsel-title" className="nsel-title">{isEdit ? 'Edit selection' : 'New selection'}</h3>
            <p className="nsel-lead">
              Ask your client to choose a set number of photographs. They mark them the same way as always — this gives
              the marks a name and a finish line.
            </p>
          </div>
          <button type="button" className="nsel-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="nsel-body">
          {!isEdit ? (
            <>
              <span className="nsel-label">Start from</span>
              <div className="nsel-templates">
                {TEMPLATES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`nsel-template${template === item.id ? ' is-on' : ''}`}
                    onClick={() => applyTemplate(item.id)}
                  >
                    <span className="nsel-template__name">{item.name}</span>
                    <span className="nsel-template__meta">{item.meta}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <span className="nsel-label">The selection</span>
          <div className="nsel-fields">
            <div className="nsel-field">
              <div className="nsel-field__copy">
                <p className="nsel-field__title">Name</p>
                <p className="nsel-field__desc">What your client sees at the top of the screen.</p>
              </div>
              <input
                className="nsel-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="nsel-field">
              <div className="nsel-field__copy">
                <p className="nsel-field__title">How many</p>
                <p className="nsel-field__desc">They cannot submit with more than this.</p>
              </div>
              <input
                className="nsel-input nsel-input--sm"
                type="number"
                min={1}
                value={count}
                onChange={(event) => setCount(event.target.value)}
              />
            </div>
            <div className="nsel-field">
              <div className="nsel-field__copy">
                <p className="nsel-field__title">Send it to</p>
                <p className="nsel-field__desc">Whoever opens the link is who the choices belong to.</p>
              </div>
              <input
                className="nsel-input"
                type="email"
                value={emailFocused || !email ? email : maskEmailStars(email)}
                disabled={isEdit}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>

          <span className="nsel-label">The message</span>
          <div className="nsel-preview">
            <div className="nsel-field nsel-field--preview-head">
              <div className="nsel-field__copy">
                <p className="nsel-field__title">Preview</p>
                <p className="nsel-field__desc">Your studio template is used if you leave this alone.</p>
              </div>
            </div>
            <MessagePreview
              email={email}
              name={name}
              count={parsedCount}
              chooseDisplayPath={chooseDisplayPath}
              studioName={studioName}
            />
          </div>
        </div>

        <div className="nsel-foot">
          <p className="nsel-foot__hint">
            {parsedCount
              ? `They will see a running count against ${parsedCount}.`
              : 'Leave how many blank if there is no cap.'}
          </p>
          <div className="nsel-foot__actions">
            <button type="button" className="nsel-btn nsel-btn--ghost" onClick={onClose} disabled={saving || revoking}>
              Cancel
            </button>
            {isEdit && isLocked ? (
              <button
                type="button"
                className="nsel-btn nsel-btn--revoke"
                disabled={saving || revoking}
                onClick={() => editingList && void onRevokeAccess?.(editingList)}
              >
                {revoking ? 'Revoking…' : 'Revoke access'}
              </button>
            ) : null}
            {isEdit ? (
              <button
                type="button"
                className="nsel-btn nsel-btn--dark"
                disabled={!canSave || revoking}
                onClick={() => void submit(false)}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="nsel-btn nsel-btn--ghost"
                  disabled={!canSave}
                  onClick={() => void submit(false)}
                >
                  {saving ? 'Saving…' : 'Create, do not send'}
                </button>
                <button
                  type="button"
                  className="nsel-btn nsel-btn--dark"
                  disabled={!canSave}
                  onClick={() => void submit(true)}
                >
                  {saving ? 'Sending…' : 'Create and send'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
