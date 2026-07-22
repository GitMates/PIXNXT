import React, { useState, useEffect } from 'react';
import { galleryService } from '../../services/gallery.service';
import { useNavigate } from 'react-router-dom';
import { sortCollections } from '../../utils/sortCollections';

const ITEMS_PER_PAGE = 12;

const CollectionList = ({ slug }) => {
  const [profile, setProfile] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.backgroundColor = '#fff';
    document.documentElement.style.backgroundColor = '#fff';
    window.scrollTo(0, 0);
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!slug) throw new Error('No slug');
        const photographerData = await galleryService.getPhotographerProfileBySlug(slug);
        if (!photographerData) throw new Error('Not found');
        setProfile(photographerData);
        if (photographerData.homepage_enabled !== false) {
          const collectionsData = await galleryService.getPublicCollections(photographerData.id);
          setCollections(collectionsData || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === profile.homepage_password) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  if (loading) return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#fff' }}>
      <div style={{ width:20, height:20, borderRadius:'50%', border:'2px solid #ccc', borderTopColor:'#333', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !profile) return (
    <div style={{ display:'flex', height:'100vh', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#fff' }}>
      <h1 style={{ fontSize:24, fontWeight:400, marginBottom:12, fontFamily:'Georgia, serif' }}>Portfolio Not Found</h1>
      <p style={{ color:'#999', fontFamily:'sans-serif', fontSize:14 }}>This portfolio is unavailable.</p>
    </div>
  );

  if (profile.homepage_enabled === false) return (
    <div style={{ display:'flex', height:'100vh', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#fff' }}>
      <h1 style={{ fontSize:24, fontWeight:400, fontFamily:'Georgia, serif' }}>Coming Soon</h1>
    </div>
  );

  if (profile.homepage_password && !isAuthenticated) return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#fafafa' }}>
      <div style={{ background:'#fff', padding:'60px 48px', maxWidth:400, width:'100%', textAlign:'center' }}>
        <h2 style={{ fontSize:18, fontWeight:400, marginBottom:8, fontFamily:'Georgia, serif', letterSpacing:'0.05em' }}>Password Required</h2>
        <p style={{ color:'#999', fontSize:13, marginBottom:28, fontFamily:'sans-serif' }}>Enter password to view this portfolio.</p>
        <form onSubmit={handlePasswordSubmit}>
          <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
            placeholder="Password" autoFocus
            style={{ width:'100%', padding:'12px 16px', border:`1px solid ${passwordError ? '#e00' : '#ddd'}`, borderRadius:0, fontSize:14, marginBottom:12, boxSizing:'border-box', outline:'none', fontFamily:'sans-serif' }} />
          {passwordError && <p style={{ color:'#e00', fontSize:12, marginBottom:10, fontFamily:'sans-serif' }}>Incorrect password.</p>}
          <button type="submit" style={{ width:'100%', background:'#111', color:'#fff', border:'none', borderRadius:0, padding:'14px', fontSize:13, cursor:'pointer', letterSpacing:'0.12em', textTransform:'uppercase', fontFamily:'sans-serif' }}>Enter Portfolio</button>
        </form>
      </div>
    </div>
  );

  const photographerName = profile.business_name || (profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : slug);
  const filteredCollections = collections
    .filter(c => c.status === 'published' && c.show_on_homepage !== false)
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const sortedCollections = sortCollections(filteredCollections, profile?.homepage_sort || 'created-new');
  const totalPages = Math.ceil(sortedCollections.length / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const pagedCollections = sortedCollections.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const goToPage = (page) => setCurrentPage(page);

  const bioText = profile.show_bio !== false && (profile.biography || profile.bio);
  const hasWebsite = profile.show_website !== false && profile.website;
  const hasPhone = profile.show_phone !== false && profile.phone;
  const hasEmail = profile.show_email !== false && (profile.contact_email || profile.email);
  const hasAddress = profile.show_address !== false && (profile.address_line_1 || profile.city);

  // Build social links list
  const socialLinks = [];
  if (profile.show_social !== false) {
    if (profile.social_instagram) socialLinks.push({ label: 'Instagram', url: profile.social_instagram.startsWith('http') ? profile.social_instagram : `https://instagram.com/${profile.social_instagram}` });
    if (profile.social_facebook) socialLinks.push({ label: 'Facebook', url: profile.social_facebook.startsWith('http') ? profile.social_facebook : `https://${profile.social_facebook}` });
    if (profile.social_x_twitter) socialLinks.push({ label: 'Twitter', url: profile.social_x_twitter.startsWith('http') ? profile.social_x_twitter : `https://${profile.social_x_twitter}` });
    if (profile.social_pinterest) socialLinks.push({ label: 'Pinterest', url: profile.social_pinterest.startsWith('http') ? profile.social_pinterest : `https://${profile.social_pinterest}` });
    if (profile.social_tiktok) socialLinks.push({ label: 'TikTok', url: profile.social_tiktok.startsWith('http') ? profile.social_tiktok : `https://${profile.social_tiktok}` });
    if (profile.social_youtube) socialLinks.push({ label: 'YouTube', url: profile.social_youtube.startsWith('http') ? profile.social_youtube : `https://${profile.social_youtube}` });
    if (profile.social_vimeo) socialLinks.push({ label: 'Vimeo', url: profile.social_vimeo.startsWith('http') ? profile.social_vimeo : `https://${profile.social_vimeo}` });
    if (profile.social_linkedin) socialLinks.push({ label: 'LinkedIn', url: profile.social_linkedin.startsWith('http') ? profile.social_linkedin : `https://${profile.social_linkedin}` });
  }

  return (
    <div style={{ background:'#fff', minHeight:'100vh', fontFamily:"'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }

        .pxn-nav-link {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #888;
          text-decoration: none;
          font-family: sans-serif;
          transition: color 0.2s;
        }
        .pxn-nav-link:hover { color: #111; }

        .pxn-contact-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #555;
          font-family: sans-serif;
          text-decoration: none;
          transition: color 0.2s;
          margin: 0 auto;
          justify-content: center;
        }
        .pxn-contact-row:hover { color: #111; }

        .pxn-card {
          cursor: pointer;
          transition: opacity 0.25s ease;
        }
        .pxn-card:hover { opacity: 0.85; }
        .pxn-card:hover .pxn-card-img {
          transform: scale(1.03);
        }
        .pxn-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.16,1,0.3,1);
          display: block;
        }

        .pxn-page-btn {
          width: 34px;
          height: 34px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          color: #888;
          font-family: sans-serif;
          transition: all 0.2s;
          letter-spacing: 0.04em;
        }
        .pxn-page-btn:hover { color: #111; }
        .pxn-page-btn.active { color: #111; font-weight: 600; border-bottom: 1px solid #111; }

        .pxn-search-input {
          background: transparent;
          border: none;
          border-bottom: 1px solid #ddd;
          outline: none;
          padding: 6px 0;
          font-size: 13px;
          font-family: sans-serif;
          color: #333;
          width: 220px;
          letter-spacing: 0.04em;
        }
        .pxn-search-input::placeholder { color: #bbb; }
      `}</style>

      {/* ── TOP NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        zIndex: 100,
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 40px',
        height: 60,
        gap: 28,
      }}>
        {/* Search toggle */}
        <button
          onClick={() => { setIsSearchOpen(p => !p); if (isSearchOpen) handleSearchChange(''); }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#888', padding:0, display:'flex', alignItems:'center', transition:'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color='#111'}
          onMouseLeave={e => e.currentTarget.style.color='#888'}
        >
          {isSearchOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          )}
        </button>
      </nav>

      {/* Search dropdown */}
      {isSearchOpen && (
        <div style={{
          position: 'fixed', top: 60, left: 0, right: 0,
          background: '#fff', zIndex: 99,
          borderBottom: '1px solid #f0f0f0',
          padding: '16px 40px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="pxn-search-input"
            type="text"
            value={searchQuery}
            autoFocus
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search galleries…"
          />
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{ paddingTop: 60 }}>

        {/* ── PROFILE HEADER ── */}
        <header style={{ textAlign: 'center', padding: '72px 40px 48px' }}>
          {/* Name */}
          <h1 style={{
            fontFamily: "'Cormorant Garamond', 'Georgia', serif",
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 300,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#111',
            margin: '0 0 20px',
          }}>
            {photographerName}
          </h1>

          {/* Bio */}
          {bioText && (
            <p style={{
              fontFamily: 'sans-serif',
              fontSize: 13,
              color: '#777',
              lineHeight: 1.7,
              maxWidth: 480,
              margin: '0 auto 28px',
              letterSpacing: '0.02em',
            }}>
              {bioText}
            </p>
          )}

          {/* Contact info block */}
          {(hasWebsite || hasPhone || hasEmail || hasAddress || socialLinks.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {hasWebsite && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank" rel="noreferrer"
                  className="pxn-contact-row"
                >
                  {/* Globe icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <span>{profile.website.replace(/^https?:\/\//, '')}</span>
                </a>
              )}
              {hasPhone && (
                <a href={`tel:${profile.phone}`} className="pxn-contact-row">
                  {/* Phone icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>{profile.phone}</span>
                </a>
              )}
              {hasEmail && (
                <a href={`mailto:${profile.contact_email || profile.email}`} className="pxn-contact-row">
                  {/* Mail icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span>{profile.contact_email || profile.email}</span>
                </a>
              )}
              {hasAddress && (
                <div className="pxn-contact-row" style={{ cursor:'default' }}>
                  {/* Map pin icon */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>
                    {[profile.address_line_1, profile.city, profile.state_province].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {/* Social links row */}
              {socialLinks.length > 0 && (
                <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:4 }}>
                  {socialLinks.map(s => (
                    <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="pxn-nav-link">
                      {s.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </header>

        {/* ── GALLERY GRID ── */}
        <section style={{ padding: '0 40px 80px', maxWidth: 1200, margin: '0 auto' }}>
          {sortedCollections.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0', color:'#aaa', fontFamily:'sans-serif', fontSize:13, letterSpacing:'0.08em', textTransform:'uppercase' }}>
              {collections.length === 0 ? 'No galleries yet.' : 'No results found.'}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '48px 32px',
            }}>
              {pagedCollections.map((col, idx) => (
                <div
                  key={col.id || idx}
                  className="pxn-card"
                  onClick={() => navigate(`/gallery/${col.slug || col.name.toLowerCase().replace(/ /g, '-')}`)}
                >
                  {/* Cover image */}
                  <div style={{ aspectRatio:'4/3', overflow:'hidden', background:'#f5f5f5', position:'relative' }}>
                    {(col.cover_url || col.cover) ? (
                      <img
                        src={col.cover_url || col.cover}
                        alt={col.name}
                        className="pxn-card-img"
                      />
                    ) : (
                      <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f5f5' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
                    )}
                  </div>

                  {/* Card metadata */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {col.homepage_password && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      )}
                      <span style={{
                        fontFamily: 'sans-serif',
                        fontSize: 13,
                        fontWeight: 500,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#222',
                      }}>
                        {col.name}
                      </span>
                    </div>
                    {col.event_date && (
                      <div style={{
                        fontFamily: 'sans-serif',
                        fontSize: 11,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: '#999',
                        marginTop: 5,
                      }}>
                        {new Date(col.event_date).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' }).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── PAGINATION ── */}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:4, marginTop:64, paddingTop:32, borderTop:'1px solid #f0f0f0' }}>
              <button
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage === 1}
                className="pxn-page-btn"
                style={{ opacity: safePage === 1 ? 0.3 : 1 }}
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`pxn-page-btn${safePage === p ? ' active' : ''}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage === totalPages}
                className="pxn-page-btn"
                style={{ opacity: safePage === totalPages ? 0.3 : 1 }}
              >›</button>
            </div>
          )}
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          textAlign: 'center',
          padding: '32px 40px 48px',
          borderTop: '1px solid #f0f0f0',
        }}>
          <p style={{ fontFamily:'sans-serif', fontSize:12, color:'#bbb', letterSpacing:'0.06em', margin:'0 0 8px' }}>
            © {photographerName.toUpperCase()}
          </p>
          <p style={{ fontFamily:'sans-serif', fontSize:11, color:'#ccc', letterSpacing:'0.04em', margin:0 }}>
            Powered by <span style={{ color:'#aaa' }}>Pixnxt</span>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default CollectionList;
