import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, ChevronDown, AlertTriangle, Layers, Gauge } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '../../services/auth.service';
import { getUserDisplayLabel, getUserInitial } from '../../lib/userInitials';
import { getThemeMode, setThemeMode, THEME_CHANGE_EVENT } from '../../lib/appearanceTheme';
import { StudioAvatar } from '../ui/StudioAvatar';
import { galleryService } from '../../services/gallery.service';
import { syncProfileIconCacheFromProfile } from '../../lib/profileIcon';
import './adminStudio.css';

const AdminLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const [themeMode, setThemeModeState] = useState(() => getThemeMode());
  const [profile, setProfile] = useState(() => {
    if (typeof window === 'undefined' || !user?.id) return null;
    try {
      const cached = localStorage.getItem(`photographer_profile_${user.id}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const userInitial = getUserInitial(user);
  const userDisplayLabel = getUserDisplayLabel(user);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const handleThemeModeChange = (mode) => {
    setThemeModeState(setThemeMode(mode));
  };

  useEffect(() => {
    const sync = () => setThemeModeState(getThemeMode());
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    galleryService
      .getPhotographerProfile(user.id)
      .then((data) => {
        if (cancelled || !data) return;
        setProfile(data);
        syncProfileIconCacheFromProfile(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowProfileDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Quotas & Limits', path: '/admin/quotas', icon: Gauge },
    { name: 'Albums & Deliveries', path: '/admin/usage', icon: Layers },
    { name: 'Crash Report', path: '/admin/crashes', icon: AlertTriangle },
  ];

  return (
    <div className="admin-shell flex h-screen overflow-hidden">
      <aside className="admin-shell__aside w-60 flex flex-col hidden md:flex shrink-0">
        <div className="admin-shell__brand h-16 flex items-center px-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[var(--ad-card)] border border-[var(--ad-line)]">
            <img src="/Logo_Final-01.png" alt="Pixnxt" className="w-5 h-5 object-contain" />
          </div>
          <div className="min-w-0 ml-3">
            <p className="font-semibold text-[13px] tracking-wide truncate text-[var(--ad-ink)]">PIXNXT</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--ad-muted)]">Admin</p>
          </div>
        </div>

        <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `admin-shell__nav-link ${isActive ? 'is-active' : ''}`
              }
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--ad-line)]">
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setShowProfileDropdown((v) => !v)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[var(--bg-surface-hover)]"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ad-card)] text-sm font-semibold text-[var(--ad-ink)] border border-[var(--ad-line)]">
                <StudioAvatar profile={profile} userId={user?.id} fallback={userInitial} alt={userDisplayLabel} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--ad-sidebar-text-active)]">
                {userDisplayLabel}
              </span>
              <ChevronDown
                className={`size-4 text-[var(--ad-muted)] transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`}
              />
            </button>
            {showProfileDropdown && (
              <div className="admin-shell__profile-menu absolute bottom-full left-0 mb-2 w-[260px] z-[500] py-1">
                <div className="px-4 py-3 border-b border-[var(--ad-line)]">
                  <p className="text-sm font-medium ad-ink truncate">{userDisplayLabel}</p>
                  <p className="text-xs ad-muted-text truncate">{user?.email}</p>
                </div>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-sm text-left ad-body-text hover:bg-[var(--ad-sunk)] flex items-center gap-3"
                  onClick={() => {
                    navigate('/admin/users');
                    setShowProfileDropdown(false);
                  }}
                >
                  <Users className="w-4 h-4" />
                  User Management
                </button>

                <div className="admin-shell__appearance" role="group" aria-label="Appearance">
                  {[
                    { id: 'light', label: 'Light' },
                    { id: 'auto', label: 'Auto' },
                    { id: 'dark', label: 'Dark' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      className={`admin-shell__appearance-btn ${themeMode === id ? 'is-active' : ''}`}
                      aria-pressed={themeMode === id}
                      onClick={() => handleThemeModeChange(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="border-t border-[var(--ad-line)]" />
                <button
                  type="button"
                  className="w-full px-4 py-3 text-sm text-left ad-body-text hover:bg-[var(--ad-sunk)] flex items-center gap-3"
                  onClick={async () => {
                    try {
                      await handleLogout();
                      setShowProfileDropdown(false);
                    } catch (err) {
                      console.error('Logout failed', err);
                    }
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        <header className="md:hidden admin-shell__aside z-10 border-b border-[var(--ad-line)]">
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[var(--ad-card)] border border-[var(--ad-line)]">
                <img src="/Logo_Final-01.png" alt="Pixnxt" className="w-4 h-4 object-contain" />
              </div>
              <span className="font-semibold text-sm tracking-wide text-[var(--ad-ink)]">Admin</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-[var(--ad-sidebar-text)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--ad-sidebar-text-active)]"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
          <nav className="ad-mnav flex gap-1.5 overflow-x-auto px-3 pb-3">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `admin-shell__nav-link shrink-0 rounded-full px-3 py-1.5 text-xs ${isActive ? 'is-active' : ''}`
                }
              >
                <item.icon className="w-3.5 h-3.5 shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </header>

        <div className="admin-studio flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
