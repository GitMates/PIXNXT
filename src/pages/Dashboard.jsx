import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';

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

/* ===== Product Data ===== */
const products = [
  {
    name: 'Client Gallery',
    color: 'teal',
    icon: <GalleryIcon />,
    links: ['Manage Collections', 'Create Collection', 'Search Photo Library', 'View Homepage', 'Settings'],
  },
  {
    name: 'Website',
    color: 'blue',
    icon: <GlobeIcon />,
    links: ['Edit Website', 'Settings'],
  },
  {
    name: 'Store',
    color: 'red',
    icon: <ShoppingBagIcon />,
    links: ['View Orders', 'Settings'],
  },
  {
    name: 'Studio Manager',
    color: 'green',
    icon: <BriefcaseIcon />,
    links: ['Manage Contacts', 'New Project', 'New Document', 'New Session', 'New Message', 'View Payments'],
  },
  {
    name: 'Mobile Gallery App',
    color: 'yellow',
    icon: <SmartphoneIcon />,
    links: ['Manage Apps', 'Create New App', 'Settings'],
  },
];

/* ===== Dashboard Component ===== */
const Dashboard = () => {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();

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

  const handleLogout = () => {
    setProfileOpen(false);
    navigate('/');
  };

  return (
    <div className="dashboard-page">
      {/* ===== Top Navbar ===== */}
      <nav className="dash-navbar">
        <div className="dash-navbar-left">
          <Link to="/" className="dash-logo">PIXNXT</Link>
          <button className="dash-nav-switcher">
            <GridIcon />
            <span>Dashboard</span>
            <ChevronDown />
          </button>
        </div>

        <div className="dash-navbar-right">
          <button className="dash-nav-icon" title="Help">
            <HelpIcon />
          </button>
          <button className="dash-nav-icon" title="Notifications">
            <BellIcon />
          </button>

          <div className="dash-profile-wrapper" ref={profileRef}>
            <button
              className="dash-profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              title="Profile"
            >
              D
            </button>

            {profileOpen && (
              <div className="dash-profile-dropdown">
                <div className="dash-dropdown-header">
                  <div className="dash-dropdown-avatar">D</div>
                  <div className="dash-dropdown-user-info">
                    <h4>Demo User</h4>
                    <p>demo@pixnxt.com</p>
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
                className={`dash-product-card ${product.name === 'Client Gallery' ? 'clickable' : ''}`}
                key={product.name}
                onClick={() => product.name === 'Client Gallery' && navigate('/client-gallery')}
              >
                <div className={`dash-product-icon ${product.color}`}>
                  {product.icon}
                </div>
                <p className="dash-product-name">{product.name}</p>
                <div className="dash-product-divider" />
                <ul className="dash-product-links">
                  {product.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (product.name === 'Client Gallery') navigate('/client-gallery');
                        }}
                      >
                        {link}
                      </a>
                    </li>
                  ))}
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
                <FolderIcon /> RECENT COLLECTIONS
              </div>
              <div className="dash-quick-card-body">
                <h3>Create your first Collection</h3>
                <p>Create your beautiful client gallery in 3 steps</p>
                <button className="dash-get-started-btn">Get Started</button>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="dash-quick-card">
              <div className="dash-quick-card-header red-icon">
                <PackageIcon /> RECENT ORDERS
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
                <BellIcon /> NOTIFICATIONS
              </div>
              <div className="dash-quick-card-body">
                <h3>Your latest Notifications</h3>
                <p>All your latest client activity will be shown here</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="dash-quick-card">
              <div className="dash-quick-card-header dark-icon">
                <LinkIcon /> QUICK LINKS
              </div>
              <div className="dash-quick-links-list">
                <div className="dash-quick-link-item">
                  <div className="dash-quick-link-icon"><UserIcon /></div>
                  <div className="dash-quick-link-info">
                    <h4>Your Profile</h4>
                    <p>Edit your profile photo, business name, and more</p>
                  </div>
                </div>
                <div className="dash-quick-link-item">
                  <div className="dash-quick-link-icon"><SettingsIcon /></div>
                  <div className="dash-quick-link-info">
                    <h4>Account</h4>
                    <p>Edit your username, email, and password</p>
                  </div>
                </div>
                <div className="dash-quick-link-item">
                  <div className="dash-quick-link-icon"><CreditCardIcon /></div>
                  <div className="dash-quick-link-info">
                    <h4>Billing</h4>
                    <p>Manage your current subscriptions, view billing history</p>
                  </div>
                </div>
                <div className="dash-quick-link-item">
                  <div className="dash-quick-link-icon"><UsersIcon /></div>
                  <div className="dash-quick-link-info">
                    <h4>Refer a Friend</h4>
                    <p>Earn referral credits for every friend you refer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* More from Pixieset */}
          <div className="dash-more-section">
            <p className="dash-section-label">MORE FROM PIXNXT</p>
            <div className="dash-blog-card">
              <img
                src="https://blog.pixieset.com/wp-content/uploads/2026/01/Pixieset-website-new-templates-custom-fonts-updates-thumbnail.gif"
                alt="Blog post - New website templates"
                className="dash-blog-image"
              />
              <div className="dash-blog-content">
                <p className="dash-blog-label">PIXNXT BLOG</p>
                <h3 className="dash-blog-title">
                  📂 New website templates, custom fonts, blog migration, and more
                </h3>
                <p className="dash-blog-excerpt">
                  Our latest updates bring powerful new tools to design, customize,
                  and manage your Pixnxt website. With 3 gorgeous new website
                  templates, support for custom fonts, shareable block designs,
                  ready-made landing pages, blog migration, and more — building
                  and updating your site is easier than ever.
                </p>
                <p className="dash-blog-date">Jan 28th, 2026</p>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="dash-footer-info">
            <div className="dash-footer-block">
              <div className="dash-footer-block-icon">
                <LifeBuoyIcon />
              </div>
              <h3>We're Here for You</h3>
              <p>
                Ask questions, browse articles & find answers. Visit the{' '}
                <a href="#">Pixnxt Help Center</a>.
              </p>
            </div>
            <div className="dash-footer-block">
              <div className="dash-footer-block-icon">
                <HeartIcon />
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
