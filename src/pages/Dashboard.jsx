import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import clientGalleryGif from '../assets/icons/photograph_17904525.gif';
import smartAlbumsGif from '../assets/icons/folder_15944871.gif';
import balancePng from '../assets/icons/client gallery.png';
import helpPng from '../assets/icons/help.png';
import notificationPng from '../assets/icons/notification.png';
import dashboardHelpPng from '../assets/icons/dashboard help.png';
import heartPng from '../assets/icons/heart.png';
import recentCollectionsGif from '../assets/icons/recent collections.gif';
import recentOrdersGif from '../assets/icons/recent orders.gif';
import notificationGif from '../assets/icons/notification.gif';
import referAFriendGif from '../assets/icons/refer a friend.gif';
import './Dashboard.css';

/* ===== SVG Icon Components ===== */
// ... (icons remain the same)

/* ===== SVG Icon Components ===== */
const GridIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);

const ChevronDown = () => (
  <svg className="chevron-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const HelpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const GiftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" />
    <line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </svg>
);

const CreditCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const LifeBuoyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
    <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" /><line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
    <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" /><line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/* ===== Product Icon SVGs ===== */
const GalleryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const ShoppingBagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const SmartphoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const AlbumIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="14" y2="10" />
  </svg>
);

const FolderIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const PackageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const products = [
  {
    name: 'Client Gallery',
    color: 'teal',
    icon: <img src={clientGalleryGif} alt="Client Gallery" className="dash-product-image-gif" loading="lazy" decoding="async" />,
    route: '/client-gallery',
    links: ['Manage Collections', 'Create Collection', 'Search Photo Library', 'View Homepage', 'Settings'],
  },
  {
    name: 'Smart Albums',
    color: 'purple',
    icon: <img src={smartAlbumsGif} alt="Smart Albums" className="dash-product-image-gif" loading="lazy" decoding="async" />,
    route: '/smart-albums',
    links: [
      { label: 'Manage Albums', path: '/smart-albums' },
      { label: 'Create Album', path: '/smart-albums/create' },
    ],
  },
  {
    name: 'Mobile Gallery App',
    color: 'teal',
    icon: <SmartphoneIcon />,
    route: '/mobile-gallery',
    links: [
      { label: 'My Apps', path: '/mobile-gallery' },
      { label: 'Create New App', path: '/mobile-gallery/create' },
    ],
  },
];

/* ===== Dashboard Component ===== */
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const [profileData, collectionsData] = await Promise.all([
          galleryService.getPhotographerProfile(user.id),
          galleryService.getCollections(user.id)
        ]);
        
        setProfile(profileData);
        setCollections(collectionsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/');
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#fafbfc]">
        <div className="w-10 h-10 border-4 border-[#8e8e93] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* ===== Top Navbar ===== */}
      <nav className="dash-navbar">
        <div className="dash-navbar-left">
          <Link to="/" className="dash-logo">PIXNXT</Link>
        </div>

        <div className="dash-navbar-right">
          <button className="dash-nav-icon" title="Help">
            <img src={helpPng} alt="Help" className="dash-nav-icon-img" />
          </button>
          <button className="dash-nav-icon" title="Notifications">
            <img src={notificationPng} alt="Notifications" className="dash-nav-icon-img" />
          </button>

          <div className="dash-profile-wrapper" ref={profileRef}>
            <button
              className="dash-profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              title="Profile"
            >
              {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </button>

            {profileOpen && (
              <div className="dash-profile-dropdown">
                <div className="dash-dropdown-header">
                  <div className="dash-dropdown-avatar">
                    {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="dash-dropdown-user-info">
                    <h4>{profile?.display_name || 'Photographer'}</h4>
                    <p>{user?.email || 'No email'}</p>
                  </div>
                </div>
                <div className="dash-dropdown-items">
                  <button className="dash-dropdown-item">
                    <GiftIcon /> Invite Friends & Get $20
                  </button>
                  <div className="dash-dropdown-divider" />
                  <button className="dash-dropdown-item">
                    <UserIcon /> Profile
                  </button>
                  <button className="dash-dropdown-item">
                    <CreditCardIcon /> Billing
                  </button>
                  <button className="dash-dropdown-item">
                    <SettingsIcon /> Advanced Settings
                  </button>
                  <div className="dash-dropdown-divider" />
                  <button className="dash-dropdown-item">
                    <UserIcon /> Account
                  </button>
                  <button className="dash-dropdown-item" onClick={handleLogout}>
                    <LogoutIcon /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ===== Main Content ===== */}
      <main className="dash-main">
        <div className="dash-content">
          <h1 className="dash-title">Dashboard</h1>

          {/* Products */}
          <p className="dash-section-label">PRODUCTS</p>
          <div className="dash-products-grid">
            {products.map((product) => (
              <div
                className={`dash-product-card ${product.route ? 'clickable' : ''}`}
                key={product.name}
                onClick={() => product.route && navigate(product.route)}
              >
                <div className={`dash-product-icon ${product.color}`}>
                  {product.icon}
                </div>
                <p className="dash-product-name">{product.name}</p>
                <div className="dash-product-divider" />
                <ul className="dash-product-links">
                  {product.links.map((link) => {
                    const label = typeof link === 'string' ? link : link.label;
                    const path = typeof link === 'string' ? product.route : link.path;
                    return (
                      <li key={label}>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (path) navigate(path);
                          }}
                        >
                          {label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Quick Access */}
          <p className="dash-section-label">QUICK ACCESS</p>
          <div className="dash-quick-grid">
            {/* Recent Collections */}
            <div className="dash-quick-card">
              <div className="dash-quick-card-header teal-icon">
                <img src={recentCollectionsGif} alt="Recent Collections" /> RECENT COLLECTIONS
              </div>
              <div className="dash-quick-card-body">
                {collections.length > 0 ? (
                  <>
                    <h3>You have {collections.length} active collection{collections.length > 1 ? 's' : ''}</h3>
                    <p>Keep showcasing your beautiful work to your clients.</p>
                    <button className="dash-get-started-btn" onClick={() => navigate('/client-gallery')}>
                      Manage Collections
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Create your first Collection</h3>
                    <p>Create your beautiful client gallery in 3 steps</p>
                    <button className="dash-get-started-btn" onClick={() => navigate('/collections/get-started')}>
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="dash-quick-card">
              <div className="dash-quick-card-header red-icon">
                <img src={recentOrdersGif} alt="Recent Orders" /> RECENT ORDERS
              </div>
              <div className="dash-quick-card-body">
                <h3>Setup your 24/7 Print Store</h3>
                <p>Launch your online store in 4 easy steps</p>
                <button className="dash-get-started-btn">Get Started</button>
              </div>
            </div>

            {/* Notifications */}
            <div className="dash-quick-card">
              <div className="dash-quick-card-header dark-icon">
                <img src={notificationGif} alt="Notifications" /> NOTIFICATIONS
              </div>
              <div className="dash-quick-card-body">
                <h3>Your latest Notifications</h3>
                <p>All your latest client activity will be shown here</p>
              </div>
            </div>

            {/* Refer a Friend */}
            <div className="dash-quick-card">
              <div className="dash-quick-card-header dark-icon">
                <img src={referAFriendGif} alt="Refer a Friend" /> REFER A FRIEND
              </div>
              <div className="dash-quick-card-body">
                <h3>Invite friends & get $20</h3>
                <p>Earn referral credits for every friend you refer</p>
                <button className="dash-get-started-btn" onClick={() => navigate('/account/refer')}>
                  Refer a Friend
                </button>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="dash-footer-info">
            <div className="dash-footer-block">
              <div className="dash-footer-block-icon">
                <img src={dashboardHelpPng} alt="Help Center" />
              </div>
              <h3>We're Here for You</h3>
              <p>
                Ask questions, browse articles & find answers. Visit the{' '}
                <a href="#">Pixnxt Help Center</a>.
              </p>
            </div>
            <div className="dash-footer-block">
              <div className="dash-footer-block-icon">
                <img src={heartPng} alt="Invite Friends" />
              </div>
              <h3>Invite friends & get $20</h3>
              <p>
                Spread the love and earn referral credits for every friend you refer.{' '}
                <a href="#">Invite friends now</a>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
