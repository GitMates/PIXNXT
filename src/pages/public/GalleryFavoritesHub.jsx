import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Lock, MessageCircle } from 'lucide-react';
import { galleryService } from '../../services/gallery.service';
import './GalleryFavoritesHub.css';

function SelectionCardCover({ coverUrl }) {
  if (!coverUrl) {
    return (
      <div className="selection-card__cover selection-card__cover--empty">
        <div className="selection-card__empty-state">
          <Heart size={18} strokeWidth={1.5} aria-hidden />
          <span>Nothing chosen yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="selection-card__cover">
      <img src={coverUrl} alt="" loading="lazy" />
    </div>
  );
}

function SelectionCard({ list, chooseBasePath }) {
  const cap =
    list.max_selection != null && Number(list.max_selection) > 0
      ? Number(list.max_selection)
      : null;
  const count = list.photoCount || 0;
  const progressPct = cap ? Math.min(100, (count / cap) * 100) : 0;
  const isSubmitted = Boolean(list.submitted_at);
  const detailPath = `${chooseBasePath}/${list.id}`;
  const hasNote =
    typeof window !== 'undefined' &&
    Boolean(localStorage.getItem(`pixnxt_fav_note_${list.id}`)?.trim());

  return (
    <Link to={detailPath} className="selection-card">
      <SelectionCardCover coverUrl={list.coverUrl} />
      <div className="selection-card__body">
        <div className="selection-card__title-row">
          <h3 className="selection-card__title">{list.name}</h3>
          {isSubmitted ? (
            <span className="selection-card__sent-badge">
              <Lock size={10} strokeWidth={2} aria-hidden />
              Sent
            </span>
          ) : null}
        </div>
        {cap != null ? (
          <p className="selection-card__stat">{cap} asked for</p>
        ) : count > 0 ? (
          <p className="selection-card__stat">{count} chosen</p>
        ) : null}
        {list.description?.trim() ? (
          <p className="selection-card__desc">{list.description.trim()}</p>
        ) : null}
        {hasNote ? (
          <p className="selection-card__note-line">
            <MessageCircle size={12} strokeWidth={1.75} aria-hidden />
            You left a note.
          </p>
        ) : null}
        {cap != null ? (
          <div className="selection-card__progress-bar">
            <div
              className="selection-card__progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        ) : null}
        <div className="selection-card__footer">
          <span className="selection-card__progress-label">
            {cap != null ? (
              <>
                <strong>{count}</strong> of {cap}
              </>
            ) : (
              <>
                <strong>{count}</strong> chosen
              </>
            )}
          </span>
          <span className="selection-card__open">{isSubmitted ? 'View →' : 'Open →'}</span>
        </div>
      </div>
    </Link>
  );
}

export default function GalleryFavoritesHub() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [photographerName, setPhotographerName] = useState('your photographer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [lists, setLists] = useState([]);
  const [creating, setCreating] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  const galleryPath = `/gallery/${slug}`;
  const chooseBasePath = `/gallery/${slug}/choose`;

  const loadLists = useCallback(async (sid) => {
    const data = await galleryService.getFavoriteListsForSession(sid);
    setLists(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        setError(null);
        const data = await galleryService.getCollectionBySlug(slug);
        if (cancelled) return;
        if (!data) {
          setError('not_found');
          return;
        }
        setCollection(data);

        if (data.favorites_enabled === false) {
          navigate(galleryPath, { replace: true });
          return;
        }

        if (data.photographer_id) {
          try {
            const profile = await galleryService.getPhotographerProfile(data.photographer_id);
            if (profile?.business_name || profile?.display_name) {
              setPhotographerName(profile.business_name || profile.display_name);
            }
          } catch {
            /* optional */
          }
        }

        const saved = localStorage.getItem(`pixnxt_fav_email_${data.id}`);
        if (!saved) {
          setSessionId(null);
          setLists([]);
          return;
        }
        const session = await galleryService.createOrGetSession(data.id, saved);
        if (cancelled) return;
        setSessionId(session.id);
        await loadLists(session.id);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('load_failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [slug, navigate, galleryPath, loadLists]);

  useEffect(() => {
    if (!sessionId) return undefined;
    const refresh = () => {
      void loadLists(sessionId);
    };
    window.addEventListener('pageshow', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [sessionId, loadLists]);

  const askedLists = useMemo(
    () =>
      lists.filter(
        (list) => list.max_selection != null && Number(list.max_selection) > 0
      ),
    [lists]
  );

  const yourLists = useMemo(
    () =>
      lists.filter(
        (list) => !(list.max_selection != null && Number(list.max_selection) > 0)
      ),
    [lists]
  );

  const stillToSendCount = useMemo(
    () => askedLists.filter((list) => !list.submitted_at).length,
    [askedLists]
  );

  const handleSignOut = () => {
    if (collection?.id) {
      localStorage.removeItem(`pixnxt_fav_email_${collection.id}`);
    }
    navigate(galleryPath, { replace: true });
  };

  const openCreateModal = () => {
    setNewListName('');
    setShowCreateModal(true);
    setMoreOpen(false);
  };

  const submitNewList = async () => {
    if (!collection || !sessionId) return;
    const name = newListName.trim();
    if (!name) return;
    try {
      setCreating(true);
      const created = await galleryService.createFavoriteList(collection.id, sessionId, name);
      await loadLists(sessionId);
      setShowCreateModal(false);
      setNewListName('');
      if (created?.id) {
        navigate(`${chooseBasePath}/${created.id}`);
      }
    } catch (e) {
      console.error(e);
      alert('Could not create selection. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="selections-loading">Loading</div>;
  }

  if (error === 'not_found' || !collection) {
    return (
      <div className="selections-page">
        <main className="selections-page__main">
          <p style={{ textAlign: 'center', color: '#8a8580' }}>This gallery could not be found.</p>
          <p style={{ textAlign: 'center', marginTop: '1rem' }}>
            <Link to="/">Home</Link>
          </p>
        </main>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="selections-page">
        <main className="selections-page__main">
          <h1 className="selections-page__hero-title">Your selections</h1>
          <p className="selections-page__hero-sub">
            Sign in with your email from the gallery to view and manage your selections.
          </p>
          <p style={{ textAlign: 'center' }}>
            <Link to={galleryPath} className="selections-page__pill-btn">
              View gallery
            </Link>
          </p>
        </main>
      </div>
    );
  }

  const photographerUpper = photographerName.toUpperCase();

  return (
    <div className="selections-page">
      <header className="selections-page__header">
        <Link to={galleryPath} className="selections-page__header-back">
          <ArrowLeft size={16} strokeWidth={1.5} />
          <span>{collection.name}</span>
        </Link>
        <div className="selections-page__header-actions">
          <button type="button" className="selections-page__pill-btn" onClick={openCreateModal} disabled={creating}>
            + New selection
          </button>
          <div className="selections-page__more-wrap">
            <button
              type="button"
              className="selections-page__pill-btn"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
            >
              ···
            </button>
            {moreOpen ? (
              <div className="selections-page__more-menu">
                <button type="button" onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="selections-page__main">
        <h1 className="selections-page__hero-title">Your selections</h1>
        <p className="selections-page__hero-sub">
          Everything you have chosen, in one place. {photographerName} has asked for some of these
          — the rest are yours.
        </p>

        {askedLists.length > 0 ? (
          <section className="selections-section">
            <div className="selections-section__head">
              <span className="selections-section__label">
                Asked for by {photographerUpper}
              </span>
              {stillToSendCount > 0 ? (
                <span className="selections-section__meta">
                  {stillToSendCount} still to send
                </span>
              ) : null}
            </div>
            <div className="selections-grid">
              {askedLists.map((list) => (
                <SelectionCard key={list.id} list={list} chooseBasePath={chooseBasePath} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="selections-section">
          <div className="selections-section__head">
            <span className="selections-section__label">
              Yours
              {yourLists.length > 0 ? (
                <span className="selections-section__count-badge">{yourLists.length}</span>
              ) : null}
            </span>
            <span className="selections-section__meta">only you see these until you send them</span>
          </div>
          <div className="selections-grid">
            {yourLists.map((list) => (
              <SelectionCard key={list.id} list={list} chooseBasePath={chooseBasePath} />
            ))}
            <button type="button" className="selection-card selection-card--new" onClick={openCreateModal}>
              <span className="selection-card--new__plus">+</span>
              <p className="selection-card--new__title">New selection</p>
              <p className="selection-card--new__desc">
                Group photographs your own way — for your parents, for printing, for anything.
              </p>
            </button>
          </div>
        </section>

        <p className="selections-page__footnote">
          Nothing reaches {photographerName} until you press <strong>Send</strong> inside a
          selection.
        </p>
      </main>

      {showCreateModal ? (
        <div
          className="selection-create-overlay"
          onClick={() => !creating && setShowCreateModal(false)}
          role="presentation"
        >
          <div
            className="selection-create-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="selection-create-title"
          >
            <h2 id="selection-create-title" className="selection-create-modal__title">
              New selection
            </h2>
            <p className="selection-create-modal__desc">
              A way to group photographs for yourself.Only you see it until you send it.
            </p>
            <label className="selection-create-modal__label" htmlFor="selection-create-name">
              What is it for
            </label>
            <input
              id="selection-create-name"
              type="text"
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="For my parents"
              className="selection-create-modal__input"
              onKeyDown={(e) => e.key === 'Enter' && submitNewList()}
            />
            <p className="selection-create-modal__hint">
              Only you and {photographerName} will see this name.
            </p>
            <div className="selection-create-modal__actions">
              <button
                type="button"
                disabled={creating}
                onClick={() => setShowCreateModal(false)}
                className="selection-create-modal__cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creating || !newListName.trim()}
                onClick={submitNewList}
                className="selection-create-modal__submit"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
