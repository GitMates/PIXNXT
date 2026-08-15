import React from 'react';
import { galleryService } from '../../../../services/gallery.service';
import { getCollectionShareUrl } from '../../../../lib/shareCollection';
import { buildGmailComposeUrl } from '../../../../lib/gmailComposeUrl';
import { ManageEmailTemplatesModal } from '../../../mobile-gallery/EmailTemplateModals';
import { FavoriteSettingsProps } from './Settings.types';
import { ToggleRow, maskEmail, relativeTime } from './settingsCardKit';
import './BasicsSettings.css';
import './SettingsCards.css';

type ListRow = {
  id: string;
  name: string;
  email?: string | null;
  description?: string | null;
  photoCount?: number;
  max_selection?: number | null;
  submitted_at?: string | null;
  updated_at?: string | null;
  sessionId?: string | null;
};

function firstName(email?: string | null) {
  const raw = String(email || '').split('@')[0] || 'your client';
  const cleaned = raw.replace(/[._-]+/g, ' ').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export const FavoriteSettings: React.FC<FavoriteSettingsProps> = ({
  collectionId,
  collection,
  setCollection,
  collectionUrl,
  profile,
  favoritePhotos,
  setFavoritePhotos,
  favoriteNotes,
  setFavoriteNotes,
  favoriteLists = [],
  onReviewList,
  onEditList,
  setShowCreateFavoriteListModal,
}) => {
  const [notifyOnSubmit, setNotifyOnSubmit] = React.useState(collection?.selection_notify_on_submit !== false);
  const [lockOnSubmit, setLockOnSubmit] = React.useState(collection?.selection_lock_on_submit !== false);
  const [chaseAfterSilence, setChaseAfterSilence] = React.useState(collection?.selection_chase_enabled !== false);
  const [showTemplates, setShowTemplates] = React.useState(false);

  React.useEffect(() => {
    setNotifyOnSubmit(collection?.selection_notify_on_submit !== false);
    setLockOnSubmit(collection?.selection_lock_on_submit !== false);
    setChaseAfterSilence(collection?.selection_chase_enabled !== false);
  }, [
    collection?.selection_notify_on_submit,
    collection?.selection_lock_on_submit,
    collection?.selection_chase_enabled,
  ]);

  const persist = async (patch: Record<string, unknown>) => {
    try {
      const updated = await galleryService.updateCollection(collectionId, patch);
      setCollection?.((prev: any) => (prev ? { ...prev, ...(updated || patch) } : prev));
    } catch (err) {
      console.error('Failed to save selection setting:', err);
    }
  };

  const shareUrl = getCollectionShareUrl(collectionUrl, profile);
  const studioName = profile?.business_name || profile?.display_name || 'Your studio';
  const lists = favoriteLists as ListRow[];

  const composeForList = (list: ListRow, kind: 'send' | 'remind') => {
    const limit = list.max_selection ? ` Pick up to ${list.max_selection}.` : '';
    const body = kind === 'send'
      ? `Hi,\n\nYour list "${list.name}" is ready.${limit}\n\n${shareUrl}\n\nPress "I'm finished" when you are happy with your choices.\n\n— ${studioName}`
      : `Hi,\n\nJust a nudge about the list "${list.name}".${limit} You have picked ${list.photoCount || 0} so far.\n\n${shareUrl}\n\n— ${studioName}`;
    const subject = kind === 'send'
      ? `Your list: ${list.name}`
      : `Still picking? ${list.name}`;
    window.open(
      buildGmailComposeUrl(body, { to: list.email || '', subject }),
      '_blank',
      'noopener,noreferrer',
    );
  };

  const statusFor = (list: ListRow) => {
    const picked = list.photoCount || 0;
    const limit = list.max_selection || 0;
    if (list.submitted_at) {
      return {
        badge: <span className="cd-basics-badge cd-basics-badge--done">Submitted · {relativeTime(list.submitted_at)}</span>,
        action: (
          <button
            type="button"
            className="cd-basics-btn cd-basics-btn--sm cd-basics-btn--primary"
            onClick={() => onReviewList?.(list)}
          >
            Review picks
          </button>
        ),
        submitted: true,
      };
    }
    if (picked > 0) {
      return {
        badge: (
          <span className="cd-basics-badge cd-basics-badge--busy">
            Still picking · {picked}{limit ? ` of ${limit}` : ''}
          </span>
        ),
        action: (
          <button
            type="button"
            className="cd-basics-btn cd-basics-btn--sm"
            onClick={() => composeForList(list, 'remind')}
          >
            Remind
          </button>
        ),
        submitted: false,
      };
    }
    return {
      badge: <span className="cd-basics-badge">Never sent</span>,
      action: (
        <button
          type="button"
          className="cd-basics-btn cd-basics-btn--sm cd-basics-btn--primary"
          onClick={() => composeForList(list, 'send')}
        >
          Send to client
        </button>
      ),
      submitted: false,
    };
  };

  const previewList = lists.find((list) => (list.max_selection || 0) > 0) || lists[0];
  const previewLimit = previewList?.max_selection || 0;
  const previewName = firstName(previewList?.email);

  return (
    <div className="cd-general-settings-view cd-basics">
      <header className="cd-basics__header">
        <h2 className="cd-basics__title">Selections</h2>
        <p className="cd-basics__kicker">this delivery</p>
      </header>

      <div className="cd-basics__cards">
        <section className="cd-basics-section-card">
          <h3 className="cd-basics-section-card__title">Client picks</h3>
          <div className="cd-basics-toggles">
            <ToggleRow
              title="Favourites"
              desc="Clients can mark photos. Review them under Activity."
              checked={favoritePhotos}
              onChange={setFavoritePhotos}
            />
            <ToggleRow
              title="Notes on favourites"
              desc="Clients can leave a note on anything they pick."
              checked={favoriteNotes}
              onChange={setFavoriteNotes}
            />
          </div>
        </section>

        <section className="cd-basics-section-card">
          <h3 className="cd-basics-section-card__title">Lists</h3>
          <p className="cd-basics-section-card__desc">
            A list is a job you are asking your client to do. Creating one does nothing until you send
            it — the status column is how you know whether they have started.
          </p>

          <div className="cd-basics-table-wrap">
            <table className="cd-basics-table">
              <thead>
                <tr>
                  <th>List</th>
                  <th>Sent to</th>
                  <th className="is-num">Limit</th>
                  <th className="is-num">Picked</th>
                  <th>Status</th>
                  <th className="is-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {lists.length === 0 ? (
                  <tr>
                    <td className="cd-basics-table__empty" colSpan={6}>
                      No lists yet. Create one and it will show up here.
                    </td>
                  </tr>
                ) : (
                  lists.map((list) => {
                    const status = statusFor(list);
                    return (
                      <tr key={list.id} className={status.submitted ? 'is-submitted' : undefined}>
                        <td>
                          <button
                            type="button"
                            className="cd-basics-table__name"
                            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600 }}
                            onClick={() => onEditList?.(list)}
                          >
                            {list.name}
                          </button>
                          {list.description ? (
                            <p className="cd-basics-table__sub">{list.description}</p>
                          ) : null}
                        </td>
                        <td className={list.email ? undefined : 'cd-basics-table__muted'}>
                          {maskEmail(list.email)}
                        </td>
                        <td className="is-num">
                          {list.max_selection || <span className="cd-basics-table__muted">—</span>}
                        </td>
                        <td className="is-num cd-basics-table__picked">{list.photoCount || 0}</td>
                        <td>{status.badge}</td>
                        <td className="is-action">{status.action}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <p className="cd-basics-foot">
            Each list is sent to an email address and opens as its own link — a stripped-down screen for
            choosing only, with a running count against the limit. Whoever opens that link is who the picks
            belong to.
          </p>

          <div className="cd-basics-actions-row">
            <button
              type="button"
              className="cd-basics-btn"
              onClick={() => setShowCreateFavoriteListModal(true)}
            >
              + New list
            </button>
            <button
              type="button"
              className="cd-basics-btn"
              onClick={() => setShowTemplates(true)}
            >
              Message templates
            </button>
          </div>
        </section>

        <section className="cd-basics-section-card">
          <h3 className="cd-basics-section-card__title">How you find out they have finished</h3>
          <p className="cd-basics-section-card__desc">
            Picking is not done when the count hits the limit — it is done when they say so. The client
            screen has an <strong>I'm finished</strong> button that locks the list and tells you.
          </p>

          <span className="cd-basics-caplabel">
            What {previewName} sees at {previewLimit || 'the'} of {previewLimit || 'the limit'}
          </span>
          <div className="cd-basics-msg cd-basics-msg--row">
            <div className="cd-basics-msg__body">
              <p>
                You have chosen all {previewLimit || 'of them'}. Happy with these?
              </p>
            </div>
            <div className="cd-basics-msg__actions">
              <button type="button" className="cd-basics-btn cd-basics-btn--sm" disabled>
                Keep looking
              </button>
              <button type="button" className="cd-basics-btn cd-basics-btn--sm cd-basics-btn--primary" disabled>
                I'm finished
              </button>
            </div>
          </div>

          <div className="cd-basics-toggles" style={{ marginTop: 18 }}>
            <ToggleRow
              title="Notify me when a list is submitted"
              desc="A notification, and an email if you are not logged in."
              checked={notifyOnSubmit}
              onChange={(next) => {
                setNotifyOnSubmit(next);
                void persist({ selection_notify_on_submit: next });
              }}
            />
            <ToggleRow
              title="Lock the list once submitted"
              desc="They cannot change picks afterwards without asking you to reopen it."
              checked={lockOnSubmit}
              onChange={(next) => {
                setLockOnSubmit(next);
                void persist({ selection_lock_on_submit: next });
              }}
            />
            <ToggleRow
              title="Chase after seven days of silence"
              desc="One automatic reminder if they were sent a list and never opened it."
              checked={chaseAfterSilence}
              onChange={(next) => {
                setChaseAfterSilence(next);
                void persist({ selection_chase_enabled: next });
              }}
            />
          </div>

          <p className="cd-basics-foot">
            Submitted lists turn green in the table above and appear under <strong>Activity</strong> with the
            full pick list and any notes. That is where you read what they chose.
          </p>
        </section>
      </div>

      {showTemplates && profile?.id ? (
        <ManageEmailTemplatesModal
          photographerId={profile.id}
          appName={collection?.name || 'this delivery'}
          senderName={studioName}
          onClose={() => setShowTemplates(false)}
          onTemplatesChange={() => {}}
        />
      ) : null}
    </div>
  );
};
