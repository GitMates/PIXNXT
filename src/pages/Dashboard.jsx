import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { loadStudioDashboard } from '../services/studioDashboard.service';
import AlbumListCoverThumb from '../components/smart-albums/AlbumListCoverThumb';
import DashboardCommandSearch from '../components/dashboard/DashboardCommandSearch';
import './Dashboard.css';

const STUDIO_STATS = [
  { label: 'OWED TO YOU', value: '₹1,45,000', sub: '2 invoices · oldest 21 days' },
  { label: 'BOOKED THIS MONTH', value: '₹6,80,000', sub: '₹2,15,000 received' },
  { label: 'LIVE DELIVERIES', value: '24', sub: '18 galleries · 6 albums' },
  { label: 'SHOOTS THIS MONTH', value: '9', sub: 'Across 5 projects' },
];

const NEEDS_YOU = [
  {
    group: 'OWED A REPLY',
    items: [
      {
        channel: 'PORTAL',
        title: 'Meera & Rohan',
        sub: 'Proposal opened · no reply',
        status: 'Waiting 2 days',
        tone: 'warn',
        action: 'Reply on WhatsApp →',
        route: '/portal',
      },
      {
        channel: 'GUEST DELIVERY',
        title: 'Ananya Sangeet',
        sub: '28 faces need review',
        status: 'Waiting 1 day',
        tone: 'warn',
        action: 'Review matches →',
        route: '/guest-delivery',
      },
    ],
  },
  {
    group: 'MONEY',
    items: [
      {
        channel: 'INVOICE',
        title: 'INV-2041 · Priya & Karthik',
        sub: 'Balance ₹45,000',
        status: '6 days past due',
        tone: 'warn',
        action: 'Send UPI reminder →',
        route: '/portal',
      },
    ],
  },
  {
    group: 'ON YOUR DESK',
    items: [
      {
        channel: 'ALBUM',
        title: 'Priya & Karthik — Album v2',
        sub: 'Client left 4 comments',
        status: 'Waiting 9 days',
        tone: 'warn',
        action: 'Open album →',
        route: '/album-proofer',
      },
    ],
  },
];

const THIS_WEEK = [
  {
    day: 'WED',
    date: '13',
    title: 'Nithya & Arun',
    detail: 'Sangeet · 1 of 3 · 4:30 PM · Chennai',
    status: '3 of 5 ready',
    tone: 'warn',
    progress: 3,
    total: 5,
  },
  {
    day: 'FRI',
    date: '15',
    title: 'Meera & Rohan',
    detail: 'Engagement · 1 of 1 · 10:00 AM · Coimbatore',
    status: 'Ready',
    tone: 'ok',
    progress: 4,
    total: 4,
  },
  {
    day: 'SAT',
    date: '16',
    title: 'Studio day',
    detail: 'Portraits · 2 slots · 11 AM & 3 PM',
    status: '1 of 2 ready',
    tone: 'warn',
    progress: 1,
    total: 2,
  },
];

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

function studioHost(profile) {
  const slug = (profile?.showcase_slug || profile?.display_name || 'studio')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);
  return `${slug || 'studio'}.pixnxt.in`;
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTodayLine() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [modules, setModules] = useState([]);
  const [recentWork, setRecentWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const profileRef = useRef(null);
  const newRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [profileData, dash] = await Promise.all([
          galleryService.getPhotographerProfile(user.id),
          loadStudioDashboard(user.id),
        ]);
        setProfile(profileData);
        setModules(dash.modules || []);
        setRecentWork(dash.recentWork || []);
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

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

  if (loading && !profile) {
    return (
      <div className="sd-loading">
        <div className="sd-spinner" />
      </div>
    );
  }

  const firstName = firstNameFrom(profile, user);
  const initials = initialsFrom(profile, user);
  const studioName = profile?.display_name || 'Your studio';
  const host = studioHost(profile);
  const mark = (studioName.trim()[0] || 'S').toUpperCase();

  return (
    <div className="sd-page">
      <header className="sd-topbar">
        <div className="sd-brand">
          <span className="sd-brand-mark" aria-hidden>
            {mark}
          </span>
          <div className="sd-brand-text">
            <span className="sd-brand-name">{studioName}</span>
            <span className="sd-brand-host">{host}</span>
          </div>
        </div>

        <DashboardCommandSearch />

        <div className="sd-topbar-right">
          <button type="button" className="sd-icon-btn" title="Notifications" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          <div className="sd-profile-wrap" ref={profileRef}>
            <button
              type="button"
              className="sd-avatar"
              onClick={() => setProfileOpen((v) => !v)}
              aria-expanded={profileOpen}
              title="Profile"
            >
              {initials}
            </button>
            {profileOpen && (
              <div className="sd-menu">
                <div className="sd-menu-head">
                  <div className="sd-avatar sd-avatar--sm">{initials}</div>
                  <div>
                    <strong>{studioName}</strong>
                    <p>{user?.email || ''}</p>
                  </div>
                </div>
                <button type="button" className="sd-menu-item" onClick={() => { setProfileOpen(false); navigate('/account/studio-identity'); }}>
                  Profile
                </button>
                <button type="button" className="sd-menu-item" onClick={() => { setProfileOpen(false); navigate('/account/plan-billing'); }}>
                  Billing
                </button>
                <button type="button" className="sd-menu-item" onClick={() => { setProfileOpen(false); navigate('/settings'); }}>
                  Settings
                </button>
                <div className="sd-menu-divider" />
                <button type="button" className="sd-menu-item" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="sd-main">
        <section className="sd-hero">
          <div className="sd-hero-copy">
            <h1 className="sd-greeting">
              {greetingForNow()}, {firstName}.
            </h1>
            <p className="sd-status">
              {formatTodayLine()}. <strong>Two clients are waiting on a reply</strong>, and one invoice is
              six days past due. Everything else is moving.
            </p>
          </div>

          <div className="sd-new-wrap" ref={newRef}>
            <button
              type="button"
              className="sd-new-btn"
              onClick={() => setNewOpen((v) => !v)}
              aria-expanded={newOpen}
            >
              New
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {newOpen && (
              <div className="sd-new-menu">
                <div className="sd-new-menu-header">CREATE</div>
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
                        <span className="sd-new-menu-label">{item.label}</span>
                        <span className="sd-new-menu-desc">{item.description}</span>
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
            <span className="sd-overline">RECENT WORK</span>
            <Link to="/client-gallery" className="sd-link">
              All deliveries
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
                      style={
                        item.coverUrl
                          ? {
                              backgroundImage: `url(${item.coverUrl})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : { background: item.gradient }
                      }
                    />
                  )}
                  <span className="sd-recent-title">{item.title}</span>
                  <span className="sd-recent-meta">{item.meta}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="sd-recent-empty">
              <p>No recent work yet. Create a delivery, album, or guest event to see it here.</p>
              <button type="button" className="sd-new-btn" onClick={() => navigate('/deliveries/create')}>
                New delivery
              </button>
            </div>
          )}
        </section>

        <section className="sd-section">
          <div className="sd-section-head">
            <span className="sd-overline sd-overline--accent">THE STUDIO</span>
          </div>
          <div className="sd-studio">
            {STUDIO_STATS.map((stat) => (
              <div key={stat.label} className="sd-studio-cell">
                <span className="sd-studio-label">{stat.label}</span>
                <span className="sd-studio-value">{stat.value}</span>
                <span className="sd-studio-sub">{stat.sub}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="sd-split">
          <div className="sd-panel">
            <div className="sd-panel-head">
              <div className="sd-panel-title-wrap">
                <span className="sd-panel-title">NEEDS YOU</span>
                <span className="sd-badge">4</span>
              </div>
              <Link to="/portal" className="sd-link">
                Open Portal
              </Link>
            </div>
            <div className="sd-needs">
              {NEEDS_YOU.map((group) => (
                <div key={group.group} className="sd-needs-group">
                  <div className="sd-needs-group-label">{group.group}</div>
                  {group.items.map((item) => (
                    <div key={item.title} className="sd-needs-row">
                      <span className="sd-needs-channel">{item.channel}</span>
                      <div className="sd-needs-main">
                        <span className="sd-needs-title">{item.title}</span>
                        <span className="sd-needs-sub">{item.sub}</span>
                      </div>
                      <span className={`sd-needs-status sd-tone-${item.tone}`}>
                        <span className="sd-dot" aria-hidden />
                        {item.status}
                      </span>
                      <button
                        type="button"
                        className="sd-needs-action"
                        onClick={() => navigate(item.route)}
                      >
                        {item.action}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
              <div className="sd-panel-foot">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <span>
                  Three things are waiting on clients. Nothing for you to do on them.{' '}
                  <Link to="/portal" className="sd-link">
                    See them
                  </Link>
                </span>
              </div>
            </div>
          </div>

          <div className="sd-panel">
            <div className="sd-panel-head">
              <div className="sd-panel-title-wrap">
                <span className="sd-panel-title">THIS WEEK</span>
                <span className="sd-badge">3</span>
              </div>
              <Link to="/portal" className="sd-link">
                Open calendar
              </Link>
            </div>
            <div className="sd-week">
              {THIS_WEEK.map((ev) => (
                <div key={`${ev.day}-${ev.date}`} className="sd-week-row">
                  <div className="sd-week-date">
                    <span className="sd-week-day">{ev.day}</span>
                    <span className="sd-week-num">{ev.date}</span>
                  </div>
                  <div className="sd-week-body">
                    <div className="sd-week-top">
                      <span className="sd-week-title">{ev.title}</span>
                      <span className={`sd-week-status sd-tone-${ev.tone}`}>
                        <span className="sd-dot" aria-hidden />
                        {ev.status}
                      </span>
                    </div>
                    <div className="sd-week-bottom">
                      <span className="sd-week-detail">{ev.detail}</span>
                      <span className="sd-week-bars" aria-hidden>
                        {Array.from({ length: ev.total }).map((_, i) => (
                          <span
                            key={i}
                            className={`sd-week-bar${i < ev.progress ? ' sd-week-bar--on' : ''}`}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="sd-panel-foot">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>
                  The rest of the week is clear.{' '}
                  <Link to="/portal" className="sd-link">
                    Open calendar
                  </Link>
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
