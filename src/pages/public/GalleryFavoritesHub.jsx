import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, MoreHorizontal } from 'lucide-react';
import { galleryService } from '../../services/gallery.service';
import { cn } from '../../lib/utils';
import { FavoriteConfirmButton } from '../../components/features/Gallery/FavoriteConfirm/FavoriteConfirmButton';
import { FavoriteSubmitModal } from '../../components/features/Gallery/FavoriteConfirm/FavoriteSubmitModal';

export default function GalleryFavoritesHub() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [email, setEmail] = useState('');
  const [lists, setLists] = useState([]);
  const [creating, setCreating] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [confirmList, setConfirmList] = useState(null);
  const [submitClientMessage, setSubmitClientMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const moreRef = useRef(null);

  const galleryPath = `/gallery/${slug}`;

  const loadLists = useCallback(async (sid) => {
    const data = await galleryService.getFavoriteListsForSession(sid);
    setLists(data);
  }, []);

  useEffect(() => {
    const onDoc = (e) => {
      if (!moreRef.current?.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
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

        const saved = localStorage.getItem(`pixnxt_fav_email_${data.id}`);
        if (!saved) {
          setSessionId(null);
          setEmail('');
          setLists([]);
          return;
        }
        setEmail(saved);
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
      await galleryService.createFavoriteList(collection.id, sessionId, name);
      await loadLists(sessionId);
      setShowCreateModal(false);
      setNewListName('');
    } catch (e) {
      console.error(e);
      alert('Could not create list. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const openConfirmModal = (list) => {
    if (!list || list.submitted_at) return;
    if ((list.photoCount || 0) < 1) {
      alert('Select at least one photo in the gallery before confirming your favorites.');
      return;
    }
    setConfirmList(list);
    setSubmitClientMessage('');
    setShowSubmitModal(true);
  };

  const handleSubmitConfirm = async () => {
    if (!confirmList?.id || !sessionId || !collection) return;
    try {
      setIsSubmitting(true);
      await galleryService.submitFavoriteList(confirmList.id, sessionId);
      try {
        await galleryService.notifyPhotographerFavoriteSubmit({
          listId: confirmList.id,
          sessionId,
          siteOrigin: window.location.origin,
          clientMessage: submitClientMessage,
        });
      } catch (emailErr) {
        console.error('Photographer notification email failed:', emailErr);
        alert(
          'Your favorites were saved, but we could not email your photographer. They can still see your selections in Favorite Activity.'
        );
      }
      sessionStorage.removeItem(`pixnxt_fav_pick_list_${collection.id}`);
      const channel = new BroadcastChannel('pixnxt-gallery-update');
      channel.postMessage({ type: 'ACTIVITY_UPDATED', collectionId: collection.id });
      channel.close();
      setShowSubmitModal(false);
      setConfirmList(null);
      await loadLists(sessionId);
    } catch (e) {
      console.error(e);
      if (e?.code === 'NO_PHOTOS') {
        alert('Select at least one photo before confirming your favorites.');
      } else {
        alert(e?.message || 'Could not submit favorites. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const listCountLabel = (list) => {
    if (list.submitted_at) {
      return 'Submitted';
    }
    if (list.max_selection != null && Number(list.max_selection) > 0) {
      return `${list.photoCount} of ${list.max_selection} photos`;
    }
    return `${list.photoCount} ${list.photoCount === 1 ? 'photo' : 'photos'}`;
  };

  const palette = collection?.color_palette || 'dark';
  const isDark = palette === 'dark';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-[10px] font-bold uppercase tracking-[0.5em] text-white/40">
        Loading
      </div>
    );
  }

  if (error === 'not_found' || !collection) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] p-8 text-center text-white">
        <p className="mb-6 text-sm text-white/60">This gallery could not be found.</p>
        <Link to="/" className="text-[10px] font-bold uppercase tracking-[0.35em] underline">
          Home
        </Link>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div
        className={cn(
          'min-h-screen px-6 py-10',
          `theme-${palette}`
        )}
        style={{ backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' }}
      >
        <div className="mx-auto max-w-md pt-16 text-center">
          <h1 className="mb-4 text-2xl font-bold uppercase tracking-[0.2em]">Favorites</h1>
          <p className="mb-10 text-sm opacity-60" style={{ color: 'var(--gallery-meta-text)' }}>
            Sign in with your email from the gallery to view and manage your favorite lists.
          </p>
          <Link
            to={galleryPath}
            className="inline-flex items-center justify-center border px-8 py-3 text-[10px] font-bold uppercase tracking-[0.35em] transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--gallery-accent)', color: 'var(--gallery-text)' }}
          >
            View gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('min-h-screen', `theme-${palette}`)}
      style={{
        backgroundColor: 'var(--gallery-bg)',
        color: 'var(--gallery-text)',
      }}
    >
      <header
        className="flex items-center justify-between border-b px-4 py-4 md:px-10 border-[var(--gallery-border)]"
      >
        <Link
          to={galleryPath}
          className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] transition-opacity hover:opacity-60"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
          <span>{collection.name}</span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6" ref={moreRef}>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={creating}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-90 transition-opacity hover:opacity-60 disabled:opacity-40"
          >
            <Plus size={16} strokeWidth={2} />
            <span>Create</span>
          </button>
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMoreOpen((v) => !v);
              }}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-90 transition-opacity hover:opacity-60"
            >
              <MoreHorizontal size={18} strokeWidth={1.75} />
              <span>More</span>
            </button>
            {moreOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded border py-1 shadow-lg border-[var(--gallery-border)] bg-[var(--gallery-secondary-bg)] text-[var(--gallery-text)]"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="block w-full px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide opacity-90 hover:opacity-100"
                  onClick={() => {
                    setMoreOpen(false);
                    handleSignOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-16 md:pt-24">
        <h1 className="mb-3 text-center text-3xl font-bold uppercase tracking-[0.15em] md:text-4xl">Favorites</h1>
        <p className="mb-14 text-center text-sm" style={{ color: 'var(--gallery-meta-text)' }}>
          Curated by {email}
        </p>

        <div className="flex flex-col gap-8">
          {lists.map((list) => (
            <Motion.div key={list.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                to={list.submitted_at ? `${galleryPath}?list=${list.id}` : galleryPath}
                onClick={() => {
                  if (!list.submitted_at && collection?.id) {
                    sessionStorage.setItem(`pixnxt_fav_pick_list_${collection.id}`, list.id);
                  }
                }}
                className="group relative block aspect-[21/9] min-h-[200px] w-full overflow-hidden bg-zinc-800 md:aspect-[2.4/1]"
              >
                {list.coverUrl ? (
                  <img
                    src={list.coverUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-sm text-white/30">
                    No photos yet
                  </div>
                )}
                <div className="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/45" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                  <span className="text-xl font-bold uppercase tracking-[0.2em] md:text-2xl">{list.name}</span>
                  <span className="mt-2 text-sm font-normal opacity-90">{listCountLabel(list)}</span>
                  {list.submitted_at ? (
                    <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">
                      Locked
                    </span>
                  ) : null}
                </div>
              </Link>

              {list.description?.trim() ? (
                <p
                  className="mx-auto mt-5 max-w-md whitespace-pre-wrap text-center text-sm leading-relaxed"
                  style={{ color: 'var(--gallery-meta-text)' }}
                >
                  {list.description.trim()}
                </p>
              ) : null}

              {!list.submitted_at ? (
                <div
                  className={cn(
                    'mx-auto w-full max-w-md text-center',
                    list.description?.trim() ? 'mt-4' : 'mt-5'
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] opacity-50">
                    {list.name}
                  </p>
                  <p className="mb-4 mt-1 text-sm font-medium" style={{ color: 'var(--gallery-meta-text)' }}>
                    {list.max_selection != null && Number(list.max_selection) > 0
                      ? `${list.photoCount || 0} of ${list.max_selection} selected`
                      : `${list.photoCount || 0} selected`}
                  </p>
                  <FavoriteConfirmButton
                    disabled={(list.photoCount || 0) < 1}
                    isSubmitting={isSubmitting && confirmList?.id === list.id}
                    onClick={() => openConfirmModal(list)}
                  />
                  <Link
                    to={galleryPath}
                    onClick={() => {
                      if (collection?.id) {
                        sessionStorage.setItem(`pixnxt_fav_pick_list_${collection.id}`, list.id);
                      }
                    }}
                    className="mt-4 inline-block text-[10px] font-bold uppercase tracking-[0.25em] underline opacity-60 transition-opacity hover:opacity-100"
                  >
                    {list.photoCount > 0 ? 'Edit selection in gallery' : 'Select photos in gallery'}
                  </Link>
                </div>
              ) : null}
            </Motion.div>
          ))}
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={creating}
          className="mx-auto mt-12 flex w-full max-w-md items-center justify-center border py-4 text-[10px] font-bold uppercase tracking-[0.35em] transition-opacity hover:opacity-70 disabled:opacity-40"
          style={{ borderColor: 'var(--gallery-accent)', color: 'var(--gallery-text)' }}
        >
          <Plus size={14} className="mr-2" strokeWidth={2} />
          Create new list
        </button>
      </main>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/65"
              onClick={() => !creating && setShowCreateModal(false)}
            />
            <Motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="relative z-[1] w-full max-w-md border px-8 py-8 shadow-2xl border-[var(--gallery-border)] bg-[var(--gallery-secondary-bg)] text-[var(--gallery-text)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-center text-xs font-bold uppercase tracking-[0.2em]">New list</h2>
              <p className="mb-6 text-center text-sm opacity-70" style={{ color: 'var(--gallery-meta-text)' }}>
                Name this favorites list. You can pick photos for it from the gallery.
              </p>
              <input
                type="text"
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name"
                className="mb-6 w-full border px-3 py-3 text-sm outline-none border-[var(--gallery-border)] bg-[var(--gallery-bg)] text-[var(--gallery-text)] placeholder:opacity-50"
                onKeyDown={(e) => e.key === 'Enter' && submitNewList()}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setShowCreateModal(false)}
                  className="px-2 py-2 text-sm font-medium opacity-70 hover:opacity-100 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={creating || !newListName.trim()}
                  onClick={submitNewList}
                  className="rounded px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: 'var(--gallery-accent)', color: 'var(--gallery-bg)' }}
                >
                  {creating ? 'Saving…' : 'Create'}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>

      <FavoriteSubmitModal
        open={showSubmitModal}
        listName={confirmList?.name}
        photoCount={confirmList?.photoCount || 0}
        isSubmitting={isSubmitting}
        clientMessage={submitClientMessage}
        onClientMessageChange={setSubmitClientMessage}
        onCancel={() => !isSubmitting && setShowSubmitModal(false)}
        onConfirm={handleSubmitConfirm}
      />
    </div>
  );
}
