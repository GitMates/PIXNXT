import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion as Motion } from 'framer-motion';
import { ArrowLeft, Plus, LogOut } from 'lucide-react';
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

  const galleryPath = `/gallery/${slug}`;

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

  const handleCreateList = async () => {
    if (!collection || !sessionId) return;
    const name = window.prompt('Name your new favorites list', 'New list');
    if (!name || !name.trim()) return;
    try {
      setCreating(true);
      await galleryService.createFavoriteList(collection.id, sessionId, name.trim());
      await loadLists(sessionId);
    } catch (e) {
      console.error(e);
      alert('Could not create list. Please try again.');
    } finally {
      setCreating(false);
    }
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
        <div className="flex items-center gap-3 md:gap-5">
          <button
            type="button"
            onClick={handleCreateList}
            disabled={creating}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-90 transition-opacity hover:opacity-60 disabled:opacity-40"
          >
            <Plus size={16} strokeWidth={2} />
            <span className="hidden sm:inline">Create</span>
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] opacity-90 transition-opacity hover:opacity-60"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
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
                  <span className="mt-2 text-sm font-normal opacity-90">
                    {list.photoCount} {list.photoCount === 1 ? 'photo' : 'photos'}
                  </span>
                </div>
              </Link>
            </Motion.div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCreateList}
          disabled={creating}
          className="mx-auto mt-12 flex w-full max-w-md items-center justify-center border border-current py-4 text-[10px] font-bold uppercase tracking-[0.35em] transition-opacity hover:opacity-70 disabled:opacity-40"
        >
          <Plus size={14} className="mr-2" strokeWidth={2} />
          Create new list
        </button>
      </main>
    </div>
  );
}
