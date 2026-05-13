import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, MoreHorizontal } from 'lucide-react';
import { galleryService } from '../../services/gallery.service';
import { cn } from '../../lib/utils';

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

  const listCountLabel = (list) => {
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
          isDark ? 'theme-dark bg-[#0a0a0a] text-white' : 'bg-white text-zinc-900'
        )}
        style={isDark ? { backgroundColor: 'var(--gallery-bg)', color: 'var(--gallery-text)' } : undefined}
      >
        <div className="mx-auto max-w-md pt-16 text-center">
          <h1 className="mb-4 text-2xl font-bold uppercase tracking-[0.2em]">Favorites</h1>
          <p className="mb-10 text-sm opacity-60">
            Sign in with your email from the gallery to view and manage your favorite lists.
          </p>
          <Link
            to={galleryPath}
            className="inline-flex items-center justify-center border border-current px-8 py-3 text-[10px] font-bold uppercase tracking-[0.35em] transition-opacity hover:opacity-70"
          >
            View gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('min-h-screen', isDark ? 'theme-dark' : '')}
      style={{
        backgroundColor: isDark ? 'var(--gallery-bg)' : '#fafafa',
        color: isDark ? 'var(--gallery-text)' : '#111',
      }}
    >
      <header
        className={cn(
          'flex items-center justify-between border-b px-4 py-4 md:px-10',
          isDark ? 'border-white/10' : 'border-black/10'
        )}
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
                className={cn(
                  'absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded border py-1 shadow-lg',
                  isDark ? 'border-white/15 bg-zinc-900 text-white' : 'border-black/10 bg-white text-zinc-900'
                )}
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
        <p className={cn('mb-14 text-center text-sm', isDark ? 'text-white/50' : 'text-zinc-500')}>
          Curated by {email}
        </p>

        <div className="flex flex-col gap-8">
          {lists.map((list) => (
            <Motion.div key={list.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                to={`${galleryPath}?list=${list.id}`}
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
                </div>
              </Link>
            </Motion.div>
          ))}
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={creating}
          className="mx-auto mt-12 flex w-full max-w-md items-center justify-center border border-current py-4 text-[10px] font-bold uppercase tracking-[0.35em] transition-opacity hover:opacity-70 disabled:opacity-40"
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
              className={cn(
                'relative z-[1] w-full max-w-md border px-8 py-8 shadow-2xl',
                isDark ? 'border-white/15 bg-[#1a1a1a] text-white' : 'border-black/10 bg-white text-zinc-900'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-center text-xs font-bold uppercase tracking-[0.2em]">New list</h2>
              <p className={cn('mb-6 text-center text-sm', isDark ? 'text-white/55' : 'text-zinc-500')}>
                Name this favorites list. You can pick photos for it from the gallery.
              </p>
              <input
                type="text"
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name"
                className={cn(
                  'mb-6 w-full border px-3 py-3 text-sm outline-none',
                  isDark ? 'border-white/20 bg-black/30 text-white placeholder:text-white/35' : 'border-zinc-200 bg-white'
                )}
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
                  className="rounded bg-white/15 px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:bg-white/25 disabled:opacity-40"
                  style={!isDark ? { backgroundColor: '#111', color: '#fff' } : undefined}
                >
                  {creating ? 'Saving…' : 'Create'}
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
