import React from 'react';
import { persistDeliverySettings } from '../../../../lib/deliverySettingsSync';
import { getCollectionShareUrl } from '../../../../lib/shareCollection';
import { buildGmailComposeUrl } from '../../../../lib/gmailComposeUrl';
import { ManageEmailTemplatesModal } from '../../../mobile-gallery/EmailTemplateModals';
import { FavoriteSettingsProps } from './Settings.types';
import { Toggle, maskEmail } from './settingsCardKit';
import './BasicsSettings.css';
import './SettingsCards.css';
import './DownloadSettings.css';

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

function ListBadgeIcon() {
  return (
    <svg width="20" height="18" viewBox="0 0 24 24" fill="none" stroke="#a39a92" strokeWidth="1.6" aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function Row({
  title,
  desc,
  control,
}: {
  title: string;
  desc?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="cd-dl-row">
      <div className="cd-dl-row__copy">
        <p className="cd-dl-row__title">{title}</p>
        {desc ? <p className="cd-dl-row__desc">{desc}</p> : null}
      </div>
      <div className="cd-dl-row__control">{control}</div>
    </div>
  );
}

function MasterRow({
  title,
  desc,
  checked,
  onChange,
  label,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <div className={`cd-dl-master${checked ? ' is-on' : ''}`}>
      <Row
        title={title}
        desc={desc}
        control={<Toggle checked={checked} onChange={onChange} label={label} />}
      />
    </div>
  );
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
  const [allowDownloadShare, setAllowDownloadShare] = React.useState(collection?.selection_allow_download_share !== false);
  const [showTemplates, setShowTemplates] = React.useState(false);

  React.useEffect(() => {
    setNotifyOnSubmit(collection?.selection_notify_on_submit !== false);
    setLockOnSubmit(collection?.selection_lock_on_submit !== false);
    setChaseAfterSilence(collection?.selection_chase_enabled !== false);
    setAllowDownloadShare(collection?.selection_allow_download_share !== false);
  }, [
    collection?.selection_notify_on_submit,
    collection?.selection_lock_on_submit,
    collection?.selection_chase_enabled,
    collection?.selection_allow_download_share,
  ]);

  const persist = async (patch: Record<string, unknown>) => {
    await persistDeliverySettings(collectionId, collection?.slug, patch, setCollection);
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

  const listCount = lists.length;
  const submittedCount = lists.filter((list) => list.submitted_at).length;
  const choosingCount = lists.filter((list) => !list.submitted_at && (list.photoCount || 0) > 0).length;

  const statusSummary = favoritePhotos ? (
    <>
      {listCount} asked for
      {submittedCount > 0 ? (
        <> · {submittedCount} submitted</>
      ) : null}
      {choosingCount > 0 ? (
        <>, {choosingCount} still being chosen</>
      ) : null}
      {listCount === 0 ? (
        <> · no lists yet</>
      ) : null}
    </>
  ) : (
    <>Off. Your client can view and download, but cannot mark anything.</>
  );

  const rowState = (list: ListRow) => {
    const picked = list.photoCount || 0;
    const limit = list.max_selection || 0;

    if (list.submitted_at) {
      return {
        statusLabel: 'Submitted',
        statusClass: 'is-done',
        progressClass: 'is-done',
        action: (
          <button
            type="button"
            className="cd-dl-sel-review"
            onClick={() => onReviewList?.(list)}
          >
            Review
          </button>
        ),
        rowClass: 'is-submitted',
      };
    }

    if (picked > 0) {
      return {
        statusLabel: 'Choosing',
        statusClass: 'is-choosing',
        progressClass: 'is-choosing',
        action: (
          <button
            type="button"
            className="cd-dl-sel-remind"
            onClick={() => composeForList(list, 'remind')}
          >
            Remind
          </button>
        ),
        rowClass: '',
      };
    }

    return {
      statusLabel: 'Not sent',
      statusClass: 'is-muted',
      progressClass: '',
      action: (
        <button
          type="button"
          className="cd-dl-sel-send"
          onClick={() => composeForList(list, 'send')}
        >
          Send
        </button>
      ),
      rowClass: '',
    };
  };

  return (
    <div className="cd-general-settings-view cd-basics cd-dl">
      <header className="cd-basics__header">
        <h2 className="cd-basics__title">Selections</h2>
        <p className="cd-basics__kicker">this delivery</p>
        <p className="cd-basics__lead">
          What you ask your client to choose, and how you find out they have finished.
        </p>
      </header>

      <div className="cd-dl-shell is-first">
        <div className="cd-dl-box">
          <div className="cd-dl-status">
            <div className="cd-basics-card-badge">
              <ListBadgeIcon />
              <span className="cd-basics-card-badge__text">
                {listCount} {listCount === 1 ? 'list' : 'lists'}
              </span>
            </div>
            <div className="cd-dl-status__copy">
              <h3 className="cd-dl-status__title">Selections</h3>
              <p className="cd-dl-status__desc">{statusSummary}</p>
            </div>
          </div>

          <MasterRow
            title="Let your client choose photographs"
            desc="They mark photographs as they scroll. Off means the gallery is for viewing and downloading only — no marking, nothing to submit, nothing to review."
            checked={favoritePhotos}
            onChange={(next) => {
              setFavoritePhotos(next);
              void persist({ favorites_enabled: next });
            }}
            label="Let your client choose photographs"
          />

          {favoritePhotos ? (
            <div className="cd-dl-body">
              <div className="cd-dl-section__head">
                <span className="cd-dl-section__label cd-dl-section__label--inline">What you have asked for</span>
                <span className="cd-dl-section__count">{listCount}</span>
              </div>

              <div className="cd-dl-sel-table-wrap">
                <table className="cd-dl-sel-table">
                  <thead>
                    <tr>
                      <th>Selection</th>
                      <th>Sent to</th>
                      <th className="is-num">Chosen</th>
                      <th>Status</th>
                      <th className="is-action" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {lists.length === 0 ? (
                      <tr>
                        <td className="cd-dl-sel-table__empty" colSpan={5}>
                          No lists yet. Create one and send it when you are ready.
                        </td>
                      </tr>
                    ) : (
                      lists.map((list) => {
                        const picked = list.photoCount || 0;
                        const limit = list.max_selection || 0;
                        const state = rowState(list);
                        const progress = limit > 0 ? Math.min(100, Math.round((picked / limit) * 100)) : 0;

                        return (
                          <tr key={list.id} className={state.rowClass}>
                            <td>
                              <button
                                type="button"
                                className="cd-dl-sel-table__name"
                                onClick={() => onEditList?.(list)}
                              >
                                {list.name}
                              </button>
                              {list.description ? (
                                <p className="cd-dl-sel-table__sub">{list.description}</p>
                              ) : null}
                            </td>
                            <td className={list.email ? undefined : 'cd-dl-sel-table__muted'}>
                              {list.email ? maskEmail(list.email) : 'not sent'}
                            </td>
                            <td className="is-num">
                              <span className="cd-dl-sel-table__chosen">
                                <strong>{picked}</strong>
                                {limit ? ` of ${limit}` : ''}
                              </span>
                              {limit > 0 ? (
                                <div className="cd-dl-sel-progress">
                                  <div
                                    className={`cd-dl-sel-progress__fill${state.progressClass ? ` ${state.progressClass}` : ''}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              ) : null}
                            </td>
                            <td>
                              <span className={`cd-dl-sel-badge ${state.statusClass}`}>
                                {state.statusLabel}
                              </span>
                            </td>
                            <td className="is-action">
                              <div className="cd-dl-sel-actions">
                                {state.action}
                                <button
                                  type="button"
                                  className="cd-dl-sel-more"
                                  aria-label={`More actions for ${list.name}`}
                                  onClick={() => onEditList?.(list)}
                                >
                                  ···
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                <div className="cd-dl-sel-actions-row">
                  <button
                    type="button"
                    className="cd-dl-sel-btn cd-dl-sel-btn--dark"
                    onClick={() => setShowCreateFavoriteListModal(true)}
                  >
                    + New selection
                  </button>
                  <button
                    type="button"
                    className="cd-dl-sel-btn cd-dl-sel-btn--ghost"
                    onClick={() => setShowTemplates(true)}
                  >
                    Message templates
                  </button>
                </div>
              </div>

              <p className="cd-dl-section__label" style={{ marginTop: 28 }}>How it works</p>
              <div className="cd-dl-card" style={{ marginBottom: 18 }}>
                <Row
                  title="Lock it once submitted"
                  desc="They cannot change their choices afterwards without asking you to reopen it. This is what stops the wrong album going to print."
                  control={(
                    <Toggle
                      checked={lockOnSubmit}
                      onChange={(next) => {
                        setLockOnSubmit(next);
                        void persist({ selection_lock_on_submit: next });
                      }}
                      label="Lock it once submitted"
                    />
                  )}
                />
                <Row
                  title="Tell me when one is submitted"
                  desc="A notification, and an email if you are not logged in."
                  control={(
                    <Toggle
                      checked={notifyOnSubmit}
                      onChange={(next) => {
                        setNotifyOnSubmit(next);
                        void persist({ selection_notify_on_submit: next });
                      }}
                      label="Tell me when one is submitted"
                    />
                  )}
                />
                <Row
                  title="Chase after seven days of silence"
                  desc="One automatic reminder if it was sent and never opened."
                  control={(
                    <Toggle
                      checked={chaseAfterSilence}
                      onChange={(next) => {
                        setChaseAfterSilence(next);
                        void persist({ selection_chase_enabled: next });
                      }}
                      label="Chase after seven days of silence"
                    />
                  )}
                />
                <Row
                  title="Let them leave a note"
                  desc="A line of explanation against any photograph they choose."
                  control={(
                    <Toggle
                      checked={favoriteNotes}
                      onChange={(next) => {
                        setFavoriteNotes(next);
                        void persist({ favorites_allow_comments: next });
                      }}
                      label="Let them leave a note"
                    />
                  )}
                />
                <Row
                  title="Allow download and share on selections"
                  desc="Show the Download and Share buttons on selection pages. Off hides both — sending the selection to you still works."
                  control={(
                    <Toggle
                      checked={allowDownloadShare}
                      onChange={(next) => {
                        setAllowDownloadShare(next);
                        void persist({ selection_allow_download_share: next });
                      }}
                      label="Allow download and share on selections"
                    />
                  )}
                />
              </div>

              <div className="cd-dl-callout">
                <p>
                  <strong>One way to choose, not two.</strong>{' '}
                  Your client marks photographs the same way whether or not you have asked for something specific.
                  A selection just gives those marks a name, a number to reach, and a finish button.
                </p>
              </div>
            </div>
          ) : null}
        </div>
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
