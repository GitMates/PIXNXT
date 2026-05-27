import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
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
  const [layoutMode, setLayoutMode] = useState('grid');
  const [scrollY, setScrollY] = useState(0);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    document.body.style.backgroundColor = '#0a0a0a';
    document.documentElement.style.backgroundColor = '#0a0a0a';
    window.scrollTo(0, 0);
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#0a0a0a' }}>
      <div style={{ width:24, height:24, borderRadius:'50%', border:'2px solid #8BDFDD', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !profile) return (
    <div style={{ display:'flex', height:'100vh', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#fff' }}>
      <h1 style={{ fontSize:24, fontWeight:700, marginBottom:12 }}>Portfolio Not Found</h1>
      <p style={{ color:'#888' }}>This portfolio is unavailable.</p>
    </div>
  );

  if (profile.homepage_enabled === false) return (
    <div style={{ display:'flex', height:'100vh', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#fff' }}>
      <h1 style={{ fontSize:24, fontWeight:700, marginBottom:12 }}>Coming Soon</h1>
    </div>
  );

  if (profile.homepage_password && !isAuthenticated) return (
    <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#fafafa' }}>
      <div style={{ background:'#fff', padding:'60px 48px', borderRadius:12, maxWidth:420, width:'100%', textAlign:'center', boxShadow:'0 8px 40px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Password Required</h2>
        <p style={{ color:'#888', fontSize:14, marginBottom:32 }}>Enter password to view this portfolio.</p>
        <form onSubmit={handlePasswordSubmit}>
          <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
            placeholder="Password" autoFocus
            style={{ width:'100%', padding:'12px 16px', border:`1px solid ${passwordError ? '#f00' : '#e0e0e0'}`, borderRadius:8, fontSize:15, marginBottom:16, boxSizing:'border-box', outline:'none' }} />
          {passwordError && <p style={{ color:'red', fontSize:13, marginBottom:12 }}>Incorrect password.</p>}
          <button type="submit" style={{ width:'100%', background:'#111', color:'#fff', border:'none', borderRadius:8, padding:'14px', fontSize:15, cursor:'pointer' }}>Enter Portfolio</button>
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

  // Scroll transition: white panel moves up on scroll
  const TRANSITION_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : 800;
  const panelProgress = Math.min(scrollY / TRANSITION_HEIGHT, 1);
  const whiteY = -panelProgress * 100; // moves from 0 to -100vh
  const showcaseOpacity = panelProgress;

  const highlightCollection = sortedCollections[0];

  return (
    <div ref={containerRef} style={{ background:'#0a0a0a', minHeight:'200vh', fontFamily:"'EB Garamond', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }

        .coll-card { cursor:pointer; transition: transform 0.5s cubic-bezier(0.16,1,0.3,1); }
        .coll-card:hover { transform: translateY(-6px); }
        .coll-card:hover .coll-img { transform: scale(1.04); }
        .coll-img { width:100%; height:100%; object-fit:cover; transition: transform 1.2s cubic-bezier(0.16,1,0.3,1); }
        .coll-title { font-size:14px; letter-spacing:0.16em; text-transform:uppercase; color:#fff; margin-top:16px; font-family:'EB Garamond', serif; }
        .coll-date { font-size:11px; letter-spacing:0.12em; color:#8BDFDD; margin-top:6px; text-transform:uppercase; font-family: sans-serif; }
        .contact-pill { display:inline-flex; align-items:center; gap:10px; padding:10px 20px; border-radius:40px; border:1px solid rgba(0,0,0,0.08); font-size:13px; letter-spacing:0.05em; color:#333; transition: all 0.3s ease; text-decoration:none; }
        .contact-pill:hover { border-color:#8BDFDD; color:#111; background:rgba(139,223,221,0.06); }
        .nav-link { font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#888; text-decoration:none; transition:color 0.2s; }
        .nav-link:hover { color:#111; }
        .showcase-nav-link { font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:#a3a3a3; text-decoration:none; transition:color 0.2s; }
        .showcase-nav-link:hover { color:#8BDFDD; }
        @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(8px); } }
        .scroll-indicator { animation: bounce 1.6s ease-in-out infinite; }
        .page-btn { width:40px; height:40px; border-radius:50%; border:none; cursor:pointer; font-size:13px; font-weight:600; transition:all 0.2s; }
      `}</style>

      {/* ── DARK SHOWCASE (fixed behind) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: '#0a0a0a', zIndex: 0,
        opacity: showcaseOpacity,
        pointerEvents: panelProgress < 0.5 ? 'none' : 'auto',
        transition: 'opacity 0.1s linear',
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Dark nav */}
        <div style={{ padding:'36px 64px 0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontFamily:"'EB Garamond',serif", fontSize:20, fontWeight:500, letterSpacing:'0.22em', textTransform:'uppercase', color:'#fff' }}>{photographerName}</span>
          <div style={{ display:'flex', gap:24, alignItems:'center' }}>
            {profile.show_email !== false && (profile.contact_email || profile.email) && (
              <a href={`mailto:${profile.contact_email || profile.email}`} className="showcase-nav-link">Email</a>
            )}
            {profile.show_phone !== false && profile.phone && (
              <a href={`tel:${profile.phone}`} className="showcase-nav-link">Call</a>
            )}
            {profile.show_website !== false && profile.website && (
              <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="showcase-nav-link">Website</a>
            )}
            {profile.show_social !== false && profile.social_instagram && (
              <a href={profile.social_instagram.startsWith('http') ? profile.social_instagram : `https://${profile.social_instagram}`} target="_blank" rel="noreferrer" className="showcase-nav-link">Instagram</a>
            )}
            {profile.show_social !== false && profile.social_facebook && (
              <a href={profile.social_facebook.startsWith('http') ? profile.social_facebook : `https://${profile.social_facebook}`} target="_blank" rel="noreferrer" className="showcase-nav-link">Facebook</a>
            )}
            {profile.show_social !== false && profile.social_x_twitter && (
              <a href={profile.social_x_twitter.startsWith('http') ? profile.social_x_twitter : `https://${profile.social_x_twitter}`} target="_blank" rel="noreferrer" className="showcase-nav-link">Twitter</a>
            )}
            {profile.show_social !== false && profile.social_pinterest && (
              <a href={profile.social_pinterest.startsWith('http') ? profile.social_pinterest : `https://${profile.social_pinterest}`} target="_blank" rel="noreferrer" className="showcase-nav-link">Pinterest</a>
            )}
            {profile.show_social !== false && profile.social_tiktok && (
              <a href={profile.social_tiktok.startsWith('http') ? profile.social_tiktok : `https://${profile.social_tiktok}`} target="_blank" rel="noreferrer" className="showcase-nav-link">TikTok</a>
            )}
            {profile.show_social !== false && profile.social_youtube && (
              <a href={profile.social_youtube.startsWith('http') ? profile.social_youtube : `https://${profile.social_youtube}`} target="_blank" rel="noreferrer" className="showcase-nav-link">YouTube</a>
            )}
            {profile.show_social !== false && profile.social_vimeo && (
              <a href={profile.social_vimeo.startsWith('http') ? profile.social_vimeo : `https://${profile.social_vimeo}`} target="_blank" rel="noreferrer" className="showcase-nav-link">Vimeo</a>
            )}
            {profile.show_social !== false && profile.social_linkedin && (
              <a href={profile.social_linkedin.startsWith('http') ? profile.social_linkedin : `https://${profile.social_linkedin}`} target="_blank" rel="noreferrer" className="showcase-nav-link">LinkedIn</a>
            )}
            <button onClick={() => { setIsSearchOpen(p => !p); if (isSearchOpen) handleSearchChange(''); }}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#a3a3a3', padding:0, display:'flex', alignItems:'center', transition:'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#8BDFDD'}
              onMouseLeave={e => e.currentTarget.style.color = '#a3a3a3'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
        {isSearchOpen && (
          <div style={{ padding:'20px 64px 0' }}>
            <input type="text" value={searchQuery} autoFocus onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search collections…"
              style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:40, padding:'10px 24px', color:'#fff', fontSize:14, letterSpacing:'0.04em', outline:'none', width:300, fontFamily:"'EB Garamond',serif" }} />
          </div>
        )}

        {/* Section label */}
        <div style={{ padding:'48px 64px 32px', flexShrink:0 }}>
          <p style={{ fontSize:11, letterSpacing:'0.28em', textTransform:'uppercase', color:'#8BDFDD', margin:0, fontFamily:'sans-serif' }}>Editorial Showcase</p>
          <div style={{ marginTop:8, width:40, height:1, background:'rgba(139,223,221,0.3)' }} />
        </div>

        {/* Collections Grid */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 64px 64px' }}>
          {sortedCollections.length === 0 ? (
            <p style={{ color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', fontSize:13 }}>
              {collections.length === 0 ? 'No collections yet.' : 'No results found.'}
            </p>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:32 }}>
              {pagedCollections.map((col, idx) => (
                <div key={col.id || idx} className="coll-card"
                  onClick={() => navigate(`/gallery/${col.slug || col.name.toLowerCase().replace(/ /g, '-')}`)}>
                  <div style={{ aspectRatio:'3/2', overflow:'hidden', borderRadius:8, background:'#1a1a1a' }}>
                    <img src={col.cover_url || col.cover || 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&q=60'}
                      alt={col.name} className="coll-img" />
                  </div>
                  <div className="coll-title">{col.name}</div>
                  {col.event_date && (
                    <div className="coll-date">
                      {new Date(col.event_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:60, paddingTop:32, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => goToPage(safePage - 1)} disabled={safePage === 1}
                className="page-btn" style={{ background:'transparent', color:'#555', opacity: safePage===1 ? 0.3 : 1 }}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => goToPage(p)} className="page-btn"
                  style={{ background: safePage===p ? '#8BDFDD' : 'transparent', color: safePage===p ? '#0a0a0a' : '#555', fontFamily:"'EB Garamond',serif" }}>
                  {p}
                </button>
              ))}
              <button onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages}
                className="page-btn" style={{ background:'transparent', color:'#555', opacity: safePage===totalPages ? 0.3 : 1 }}>›</button>
            </div>
          )}
        </div>
      </div>

      {/* ── WHITE INTRO PANEL (slides up on scroll) ── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '100vh',
        background: '#fafafa', zIndex: 10,
        transform: `translateY(${whiteY}vh)`,
        transition: 'none',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        pointerEvents: panelProgress > 0.95 ? 'none' : 'auto',
      }}>
        {/* White nav */}
        <div style={{ padding:'36px 64px 0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontFamily:"'EB Garamond',serif", fontSize:18, fontWeight:500, letterSpacing:'0.28em', textTransform:'uppercase', color:'#111' }}>{photographerName}</span>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontFamily:'sans-serif', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'#bbb' }}>Professional Portfolio</span>
          </div>
        </div>

        {/* Main editorial layout */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 64px 48px', position:'relative' }}>

          {/* Large hero greeting — centered vertically */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ duration:1.3, ease:[0.16,1,0.3,1] }}>
              <h1 style={{ fontFamily:"'EB Garamond',serif", fontWeight:400, fontSize:'clamp(56px, 8.5vw, 116px)', lineHeight:0.95, letterSpacing:'-0.02em', color:'#111', margin:0 }}>
                hello,<br />
                welcome to my<br />
                <em style={{ fontStyle:'italic', color:'#222' }}>portfolio</em>
              </h1>
            </motion.div>

            {/* Horizontal rule accent */}
            <motion.div initial={{ scaleX:0, originX:0 }} animate={{ scaleX:1 }} transition={{ delay:0.6, duration:1, ease:[0.16,1,0.3,1] }}
              style={{ height:1, background:'linear-gradient(to right, #8BDFDD, transparent)', marginTop:40, marginBottom:40, maxWidth:480 }} />

            {/* Bio — only if enabled AND has content */}
            {(() => {
              const bioText = profile.show_bio !== false && (profile.biography || profile.bio);
              if (!bioText) return null;
              return (
                <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5, duration:0.9 }}>
                  <p style={{ fontFamily:"'EB Garamond',serif", fontSize:22, lineHeight:1.65, color:'#555', maxWidth:580, margin:0, fontWeight:400 }}>
                    {bioText}
                  </p>
                </motion.div>
              );
            })()}

            {/* Stats row — always show collection count; show city/phone only if enabled & set */}
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.75, duration:0.9 }}
              style={{ display:'flex', gap:48, marginTop:52 }}>
              {sortedCollections.length > 0 && (
                <div>
                  <div style={{ fontFamily:"'EB Garamond',serif", fontSize:48, fontWeight:400, color:'#111', lineHeight:1 }}>
                    {sortedCollections.length}
                  </div>
                  <div style={{ fontFamily:'sans-serif', fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'#bbb', marginTop:6 }}>Collections</div>
                </div>
              )}
              {profile.show_address !== false && (profile.address_line_1 || profile.city) && (
                <div>
                  <div style={{ fontFamily:"'EB Garamond',serif", fontSize:22, fontWeight:400, color:'#333', lineHeight:1.3, maxWidth:280 }}>
                    {profile.address_line_1 || ''}
                    {(profile.city || profile.state_province) && (
                      <div style={{ fontSize:15, color:'#666', marginTop:4 }}>
                        {[profile.city, profile.state_province].filter(Boolean).join(', ')} {profile.zip_postal_code || ''}
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily:'sans-serif', fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'#bbb', marginTop:6 }}>Based In</div>
                </div>
              )}
              {profile.show_phone !== false && profile.phone && (
                <div>
                  <div style={{ fontFamily:"'EB Garamond',serif", fontSize:22, fontWeight:400, color:'#333', lineHeight:1 }}>{profile.phone}</div>
                  <div style={{ fontFamily:'sans-serif', fontSize:10, letterSpacing:'0.22em', textTransform:'uppercase', color:'#bbb', marginTop:6 }}>Contact</div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Bottom row — collection preview strip + scroll cue */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>

            {/* Thumbnail strip — only collections with a real cover image */}
            {sortedCollections.filter(c => c.cover_url || c.cover).length > 0 && (
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.9, duration:0.9 }}
                style={{ display:'flex', gap:12, alignItems:'flex-end' }}>
                {sortedCollections.filter(c => c.cover_url || c.cover).slice(0, 3).map((col, i) => (
                  <div key={col.id || i} style={{
                    width: i === 0 ? 120 : i === 1 ? 90 : 70,
                    height: i === 0 ? 160 : i === 1 ? 120 : 90,
                    borderRadius:6, overflow:'hidden',
                    opacity: i === 0 ? 1 : i === 1 ? 0.6 : 0.35,
                    flexShrink:0,
                  }}>
                    <img src={col.cover_url || col.cover}
                      alt={col.name}
                      style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                ))}
                <div style={{ marginLeft:16 }}>
                  <div style={{ fontFamily:"'EB Garamond',serif", fontSize:13, color:'#888', letterSpacing:'0.06em' }}>Scroll to view all</div>
                  <div style={{ fontFamily:"'EB Garamond',serif", fontSize:13, color:'#8BDFDD', letterSpacing:'0.06em', marginTop:2 }}>→ {sortedCollections.length} {sortedCollections.length === 1 ? 'gallery' : 'galleries'}</div>
                </div>
              </motion.div>
            )}

          </div>
        </div>

        {/* Decorative large background letter */}
        <div style={{
          position:'absolute', right:-20, top:'50%', transform:'translateY(-50%)',
          fontFamily:"'EB Garamond',serif", fontSize:'38vw', fontWeight:400,
          color:'rgba(0,0,0,0.03)', lineHeight:1, userSelect:'none', pointerEvents:'none', letterSpacing:'-0.04em',
          zIndex:0,
        }}>{(photographerName[0] || 'P').toUpperCase()}</div>
      </div>

      {/* Spacer so page is scrollable */}
      <div style={{ height:'200vh' }} />
    </div>
  );
};

export default CollectionList;
