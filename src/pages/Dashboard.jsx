import React, { useState, useEffect, useRef } from 'react';
import { Home, FileText, CreditCard, User, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { loadStudioDashboard } from '../services/studioDashboard.service';
import { userStorageService } from '../services/userStorage.service';
import { getThemeMode, setThemeMode, THEME_CHANGE_EVENT } from '../lib/appearanceTheme';
import { navigateToAccount } from '../lib/accountBackNav';
import { buildShowcaseUrl } from '../lib/showcaseUrl';
import AlbumListCoverThumb from '../components/smart-albums/AlbumListCoverThumb';
import { CollectionCardCover } from '../components/features/ClientGallery/CollectionCardCover';
import { AppLoader } from '../components/ui/AppLoading';
import DashboardCommandSearch from '../components/dashboard/DashboardCommandSearch';
import StudioNotifications from '../components/dashboard/StudioNotifications';
import { StudioAvatar } from '../components/ui/StudioAvatar';
import { useAppLanguage } from '../context/AppLanguageContext';
import { localizeAppText } from '../lib/app-languages';
import { syncProfileIconCacheFromProfile, getStudioProfileIconSrc, preloadProfileIcon } from '../lib/profileIcon';
import './Dashboard.css';

const STUDIO_BOARD_PREFIX = 'pixnxt_studio_board_';

function readStudioBoard(userId) {
  if (!userId || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${STUDIO_BOARD_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStudioBoard(userId, dash) {
  if (!userId || !dash) return;
  try {
    sessionStorage.setItem(`${STUDIO_BOARD_PREFIX}${userId}`, JSON.stringify({
      modules: dash.modules || [],
      recentWork: dash.recentWork || [],
      studioStats: dash.studioStats || [],
      needsYou: dash.needsYou || [],
      thisWeek: dash.thisWeek || [],
      heroStatus: dash.heroStatus || '',
    }));
  } catch {
    /* ignore quota */
  }
}

const NEW_MENU = [
  {
    label: 'Delivery',
    description: 'A set of photographs with a link',
    icon: 'delivery',
    path: '/deliveries/create',
  },
  {
    label: 'Album',
    description: 'Spreads for the client to proof',
    icon: 'album',
    path: '/album-proofer/create',
  },
  {
    label: 'Project',
    description: 'A wedding or shoot, with its days',
    icon: 'project',
    path: '/portal?newProject=1',
  },
  {
    label: 'Enquiry',
    description: 'Log a lead — about fifteen seconds',
    icon: 'enquiry',
    path: '/portal?newProject=1',
  },
  {
    label: 'Print order',
    description: 'On behalf of a client',
    icon: 'print',
    path: '/store/orders',
  },
  {
    isDivider: true,
  },
  {
    label: 'Invoice',
    description: 'Standalone, outside a project',
    icon: 'invoice',
    path: '/portal',
  },
];

const getMenuIcon = (iconName) => {
  const strokeWidth = 1.75;
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  switch (iconName) {
    case 'delivery':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      );
    case 'album':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="7" height="18" rx="1.5" />
          <rect x="13" y="3" width="7" height="18" rx="1.5" />
        </svg>
      );
    case 'project':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      );
    case 'enquiry':
      return (
        <svg {...common}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case 'print':
      return (
        <svg {...common}>
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      );
    case 'invoice':
      return (
        <svg {...common} strokeWidth={2}>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      );
    default:
      return null;
  }
};

function ModuleIcon({ type }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.7',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (type === 'gallery') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    );
  }
  if (type === 'album') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="7" height="18" rx="1.5" />
        <rect x="13" y="3" width="7" height="18" rx="1.5" />
      </svg>
    );
  }
  if (type === 'portal') {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    );
  }
  if (type === 'guest') {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    );
  }
  if (type === 'mobile') {
    return (
      <svg {...common}>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function firstNameFrom(profile, user) {
  const raw =
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'there';
  return String(raw).trim().split(/\s+/)[0];
}

function initialsFrom(profile, user) {
  const name = profile?.display_name || user?.user_metadata?.full_name || '';
  if (name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (user?.email?.[0] || 'U').toUpperCase();
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function greetingLine(t, firstName) {
  const h = new Date().getHours();
  if (t?.dash?.greetMorning && h < 12) return t.dash.greetMorning(firstName);
  if (t?.dash?.greetAfternoon && h < 17) return t.dash.greetAfternoon(firstName);
  if (t?.dash?.greetEvening) return t.dash.greetEvening(firstName);
  return `${greetingForNow()}, ${firstName}.`;
}

function formatTodayLine() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function storageLimitBytes(profile) {
  if (profile?.storage_limit_bytes) return profile.storage_limit_bytes;
  const tier = String(profile?.plan || '').toLowerCase();
  if (tier === 'pro') return 100 * 1024 * 1024 * 1024;
  if (tier === 'premium') return 500 * 1024 * 1024 * 1024;
  if (tier === 'free') return 5 * 1024 * 1024 * 1024;
  return 10 * 1024 * 1024 * 1024;
}

function formatStorageAmount(bytes) {
  if (!bytes || bytes <= 0) return '0 MB';
  const tb = 1024 * 1024 * 1024 * 1024;
  const gb = 1024 * 1024 * 1024;
  if (bytes >= tb) {
    const n = bytes / tb;
    return `${n >= 10 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, '')} TB`;
  }
  if (bytes >= gb) {
    const n = bytes / gb;
    return `${n >= 10 ? n.toFixed(0) : n.toFixed(n < 1 ? 1 : 0)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { t: appT } = useAppLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => {
    if (typeof window === 'undefined' || !user?.id) return null;
    try {
      const cached = localStorage.getItem(`photographer_profile_${user.id}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [modules, setModules] = useState([]);
  const [recentWork, setRecentWork] = useState([]);
  const [studioStats, setStudioStats] = useState([]);
  const [needsYou, setNeedsYou] = useState([]);
  const [thisWeek, setThisWeek] = useState([]);
  const [heroStatus, setHeroStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [appearance, setAppearance] = useState(() => getThemeMode());
  const [realStorageBytes, setRealStorageBytes] = useState(null);
  const profileRef = useRef(null);
  const newRef = useRef(null);

  const handleAppearanceChange = (mode) => {
    setAppearance(setThemeMode(mode));
  };

  useEffect(() => {
    const sync = () => setAppearance(getThemeMode());
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        // Instant paint from cache while the network profile loads.
        try {
          const cached = localStorage.getItem(`photographer_profile_${user.id}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setProfile((prev) => prev || parsed);
            syncProfileIconCacheFromProfile(parsed);
          }
        } catch {
          /* ignore */
        }
        const cachedBoard = readStudioBoard(user.id);
        if (cachedBoard) {
          setModules(cachedBoard.modules || []);
          setRecentWork(cachedBoard.recentWork || []);
          setStudioStats(cachedBoard.studioStats || []);
          setNeedsYou(cachedBoard.needsYou || []);
          setThisWeek(cachedBoard.thisWeek || []);
          setHeroStatus(cachedBoard.heroStatus || '');
          setLoading(false);
        } else {
          setLoading(true);
        }
        try {
          const profileData = await galleryService.getPhotographerProfile(user.id);
          setProfile(profileData);
          if (profileData) {
            try {
              localStorage.setItem(`photographer_profile_${user.id}`, JSON.stringify(profileData));
            } catch {
              /* ignore */
            }
            syncProfileIconCacheFromProfile(profileData);
          }
        } catch (e) {
          console.error('Error loading profile:', e);
        }
        setLoading(false);
        const dash = await loadStudioDashboard(user.id);
        setModules(dash.modules || []);
        setRecentWork(dash.recentWork || []);
        setStudioStats(dash.studioStats || []);
        setNeedsYou(dash.needsYou || []);
        setThisWeek(dash.thisWeek || []);
        setHeroStatus(dash.heroStatus || '');
        writeStudioBoard(user.id, dash);
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    userStorageService
      .calculateUserStorageBytes(user, profile)
      .then((bytes) => {
        if (!cancelled && typeof bytes === 'number' && bytes >= 0) {
          setRealStorageBytes(bytes);
        }
      })
      .catch((err) => console.error('Error calculating real storage:', err));
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const src = getStudioProfileIconSrc(profile, user?.id);
    if (src) preloadProfileIcon(src);
  }, [profile, user?.id]);

  useEffect(() => {
    const onDoc = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (newRef.current && !newRef.current.contains(e.target)) setNewOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/');
  };

  const usedBytes = realStorageBytes ?? profile?.storage_used_bytes ?? 0;
  const maxBytes = storageLimitBytes(profile);
  const storagePct = Math.min(100, maxBytes > 0 ? (usedBytes / maxBytes) * 100 : 0);
  const storageUsedLabel = formatStorageAmount(usedBytes);
  const storageTotalLabel = `of ${formatStorageAmount(maxBytes)}`;

  if (loading && !profile) {
    return (
      <div className="sd-loading">
        <AppLoader label={appT.dash.loadingStudio} variant="page" className="sd-loading__inner" />
      </div>
    );
  }

  const firstName = firstNameFrom(profile, user);
  const initials = initialsFrom(profile, user);
  const studioName = profile?.display_name || 'Your studio';
  const showcaseUrl = buildShowcaseUrl(profile, user);
  const showcaseLabel = showcaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const tx = (value) => localizeAppText(appT, value);
  const needsYouCount = needsYou.reduce((n, g) => n + (g.items?.length || 0), 0);

  const goMenu = (path) => {
    setProfileOpen(false);
    if (String(path).startsWith('/account')) {
      navigateToAccount(navigate, path, '/dashboard');
    } else {
      navigate(path);
    }
  };

  return (
    <div className="sd-page">
      <header className="sd-topbar">
        <div className="sd-brand">
          <span className="sd-brand-mark" aria-hidden>
            <img
              src="/logo.png"
              alt=""
              className="sd-brand-mark__logo"
              width={36}
              height={36}
              decoding="async"
              fetchPriority="high"
              draggable={false}
            />
          </span>
          <div className="sd-brand-text">
            <span className="sd-brand-name">{studioName}</span>
            <a
              href={showcaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="sd-brand-host sd-brand-host--link"
            >
              {showcaseLabel}
            </a>
          </div>
        </div>

        <DashboardCommandSearch />

        <div className="sd-topbar-right">
          <StudioNotifications userId={user?.id} />

          <div className="sd-profile-wrap" ref={profileRef}>
            <button
              type="button"
              className="sd-avatar"
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
              title="Profile"
            >
              <StudioAvatar profile={profile} userId={user?.id} fallback={initials} alt="Profile" />
            </button>
            {profileOpen && (
              <div className="sd-menu" role="menu">
                <div className="sd-menu-section sd-menu-section--links">
                  <div className="sd-menu-section-title">{appT.sections.studio}</div>
                  <button type="button" className="sd-menu-item" role="menuitem" onClick={() => goMenu('/account/studio-identity')}>
                    <Home size={16} strokeWidth={1.8} />
                    <span>{appT.dash.studioIdentity}</span>
                  </button>
                  <button type="button" className="sd-menu-item" role="menuitem" onClick={() => goMenu('/account/legal-consent')}>
                    <FileText size={16} strokeWidth={1.8} />
                    <span>{appT.dash.legalConsent}</span>
                  </button>
                  <button type="button" className="sd-menu-item" role="menuitem" onClick={() => goMenu('/account/billing')}>
                    <CreditCard size={16} strokeWidth={1.8} />
                    <span>{appT.dash.planBilling}</span>
                  </button>
                </div>

                <div className="sd-menu-divider" />

                <div className="sd-menu-section sd-menu-section--links">
                  <div className="sd-menu-section-title">{appT.sections.you}</div>
                  <button type="button" className="sd-menu-item" role="menuitem" onClick={() => goMenu('/account/account')}>
                    <User size={16} strokeWidth={1.8} />
                    <span>{appT.dash.yourAccount}</span>
                  </button>
                </div>

                <div className="sd-menu-section sd-menu-section--appearance">
                  <div className="sd-appearance" role="group" aria-label="Appearance">
                      {[{ id: 'light', label: appT.common.light }, { id: 'auto', label: appT.common.auto }, { id: 'dark', label: appT.common.dark }].map(({ id: mode, label }) => (
                      <button
                        key={mode}
                        type="button"
                        className={`sd-appearance-btn${appearance === mode ? ' is-active' : ''}`}
                        aria-pressed={appearance === mode}
                        onClick={() => handleAppearanceChange(mode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sd-menu-divider" />

                <div className="sd-menu-section sd-menu-section--links">
                    <button type="button" className="sd-menu-item sd-menu-item--logout" role="menuitem" onClick={handleLogout}>
                    <LogOut size={16} strokeWidth={1.8} />
                    <span>{appT.common.signOut}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="sd-main">
        <section className="sd-hero">
          <div className="sd-hero-copy">
            <h1 className="sd-greeting">
              {greetingLine(appT, firstName)}
            </h1>
            <p className="sd-status">
              {heroStatus ? tx(heroStatus) : `${formatTodayLine()}. ${appT.dash.studioReady}`}
            </p>
          </div>

          <div className="sd-new-wrap" ref={newRef}>
            <button
              type="button"
              className="sd-new-btn"
              onClick={() => setNewOpen((v) => !v)}
              aria-expanded={newOpen}
            >
              {appT.dash.newBtn}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {newOpen && (
              <div className="sd-new-menu">
                <div className="sd-new-menu-header">{appT.dash.createHeader}</div>
                {NEW_MENU.map((item, idx) => {
                  if (item.isDivider) {
                    return <div key={`div-${idx}`} className="sd-new-menu-divider" />;
                  }
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className="sd-new-menu-item"
                      onClick={() => {
                        setNewOpen(false);
                        navigate(item.path);
                      }}
                    >
                      <span className="sd-new-menu-icon">
                        {getMenuIcon(item.icon)}
                      </span>
                      <span className="sd-new-menu-text">
                        <span className="sd-new-menu-label">{(appT.dash.newMenu?.[item.label]?.[0]) || item.label}</span>
                        <span className="sd-new-menu-desc">{(appT.dash.newMenu?.[item.label]?.[1]) || item.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="sd-modules" aria-label="Products">
          {modules.map((mod) => (
            <button
              key={mod.id}
              type="button"
              className="sd-module"
              onClick={() => navigate(mod.route)}
            >
              <span className="sd-module-icon">
                <ModuleIcon type={mod.icon} />
              </span>
              <span className="sd-module-copy">
                <span className="sd-module-title">{mod.title}</span>
                <span className="sd-module-metric">{mod.metric}</span>
              </span>
              <span className={`sd-module-status sd-tone-${mod.tone}`}>
                <span className="sd-dot" aria-hidden />
                {mod.status}
              </span>
            </button>
          ))}
        </section>

        <section className="sd-section">
          <div className="sd-section-head">
            <span className="sd-overline">{appT.dash.recentWork}</span>
            <Link to="/client-gallery" className="sd-link">
              {appT.dash.allDeliveries}
            </Link>
          </div>
          {recentWork.length > 0 ? (
            <div className="sd-recent-grid">
              {recentWork.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="sd-recent-card"
                  onClick={() => navigate(item.route)}
                >
                  {item.type === 'album-proofer' && item.album ? (
                    <span className="sd-recent-thumb sd-recent-thumb--album">
                      <AlbumListCoverThumb album={item.album} alt={item.title} />
                    </span>
                  ) : (
                    <span
                      className="sd-recent-thumb"
                      style={item.coverUrl ? undefined : { background: item.gradient }}
                    >
                      {item.coverCollection ? (
                        <CollectionCardCover collection={item.coverCollection} alt="" />
                      ) : item.coverUrl ? (
                        <img
                          src={item.coverUrl}
                          alt=""
                          decoding="async"
                          style={{ objectPosition: `${item.focalX ?? 50}% ${item.focalY ?? 50}%` }}
                        />
                      ) : null}
                    </span>
                  )}
                  <span className="sd-recent-title">{item.title}</span>
                  <span className="sd-recent-meta">{item.meta}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="sd-recent-empty">
              <p>{appT.dash.emptyWork}</p>
              <button type="button" className="sd-new-btn" onClick={() => navigate('/deliveries/create')}>
                {appT.dash.newBtn} {(appT.dash.newMenu?.['Delivery']?.[0]) || 'delivery'}
              </button>
            </div>
          )}
        </section>

        <section className="sd-section">
          <div className="sd-section-head">
            <span className="sd-overline sd-overline--accent">{appT.dash.theStudio}</span>
          </div>
          <div className="sd-studio">
            {(studioStats.length ? studioStats : [
              { label: appT.dash.liveDeliveries, value: '—', sub: appT.dash.loadingStat },
            ]).map((stat) => (
              <div key={stat.label} className="sd-studio-cell">
                <span className="sd-studio-label">{tx(stat.label)}</span>
                <span className="sd-studio-value">{stat.value}</span>
                <span className="sd-studio-sub">{tx(stat.sub)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="sd-split">
          <div className="sd-panel">
            <div className="sd-panel-head">
              <div className="sd-panel-title-wrap">
                <span className="sd-panel-title">{appT.dash.needsYou}</span>
                {needsYouCount > 0 ? <span className="sd-badge">{needsYouCount}</span> : null}
              </div>
              <Link to="/client-gallery" className="sd-link">
                {appT.dash.openStudio}
              </Link>
            </div>
            <div className="sd-needs">
              {needsYou.length > 0 ? (
                needsYou.map((group) => (
                  <div key={group.group} className="sd-needs-group">
                    <div className="sd-needs-group-label">{tx(group.group)}</div>
                    {group.items.map((item) => (
                      <div key={`${item.channel}-${item.title}-${item.route}`} className="sd-needs-row">
                        <span className="sd-needs-channel">{tx(item.channel)}</span>
                        <div className="sd-needs-main">
                          <span className="sd-needs-title">{item.title}</span>
                          <span className="sd-needs-sub">{tx(item.sub)}</span>
                        </div>
                        <span className={`sd-needs-status sd-tone-${item.tone}`}>
                          <span className="sd-dot" aria-hidden />
                          {tx(item.status)}
                        </span>
                        <button
                          type="button"
                          className="sd-needs-action"
                          onClick={() => navigate(item.route)}
                        >
                          {tx(item.action)}
                        </button>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="sd-panel-empty">
                  <p>{appT.dash.nothingWaiting}</p>
                </div>
              )}
              <div className="sd-panel-foot">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <span>
                  {needsYouCount > 0
                    ? appT.dash.needsFootLive
                    : appT.dash.needsFootEmpty}
                </span>
              </div>
            </div>
          </div>

          <div className="sd-panel">
            <div className="sd-panel-head">
              <div className="sd-panel-title-wrap">
                <span className="sd-panel-title">{appT.dash.thisWeek}</span>
                {thisWeek.length > 0 ? <span className="sd-badge">{thisWeek.length}</span> : null}
              </div>
              <Link to="/client-gallery" className="sd-link">
                {appT.dash.openCalendar}
              </Link>
            </div>
            <div className="sd-week">
              {thisWeek.length > 0 ? (
                thisWeek.map((ev) => (
                  <button
                    key={`${ev.day}-${ev.date}-${ev.title}-${ev.route}`}
                    type="button"
                    className="sd-week-row"
                    onClick={() => ev.route && navigate(ev.route)}
                  >
                    <div className="sd-week-date">
                      <span className="sd-week-day">{ev.day}</span>
                      <span className="sd-week-num">{ev.date}</span>
                    </div>
                    <div className="sd-week-body">
                      <div className="sd-week-top">
                        <span className="sd-week-title">{ev.title}</span>
                        <span className={`sd-week-status sd-tone-${ev.tone}`}>
                          <span className="sd-dot" aria-hidden />
                          {tx(ev.status)}
                        </span>
                      </div>
                      <div className="sd-week-bottom">
                        <span className="sd-week-detail">{tx(ev.detail)}</span>
                        <span className={`sd-week-bars sd-week-bars--${ev.tone}`} aria-hidden>
                          {Array.from({ length: ev.total || 1 }).map((_, i) => (
                            <span
                              key={i}
                              className={`sd-week-bar${i < (ev.progress || 0) ? ' sd-week-bar--on' : ''}`}
                            />
                          ))}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="sd-panel-empty">
                  <p>{appT.dash.noEvents}</p>
                </div>
              )}
              <div className="sd-panel-foot">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>
                  {appT.dash.weekFoot}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
