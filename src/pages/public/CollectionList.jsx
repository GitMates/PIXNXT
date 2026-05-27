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
  const coverUrl = highlightCollection?.cover_url || highlightCollection?.cover;
  const coverName = highlightCollection?.name || 'Featured Work';
  const coverDate = highlightCollection?.event_date ? new Date(highlightCollection.event_date).toLocaleDateString('en-US', { month:'short', year:'numeric' }) : '';
  const collageImages = sortedCollections
    .map(c => c.cover_url || c.cover)
    .filter(Boolean)
    .slice(0, 3);

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
        <div style={{ padding:'64px 64px 24px', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:20 }}>
            <span style={{ fontSize:9, letterSpacing:'0.35em', textTransform:'uppercase', color:'#8BDFDD', fontFamily:'sans-serif', fontWeight:600 }}>
              editorial showcase
            </span>
            <div style={{ flex:1, height:1, background:'linear-gradient(to right, rgba(139,223,221,0.25), transparent)' }} />
          </div>
        </div>

        {/* Collections Grid */}
        <div style={{ flex:1, overflowY:'auto', padding:'0 64px 80px' }}>
          {sortedCollections.length === 0 ? (
            <p style={{ color:'#555', letterSpacing:'0.1em', textTransform:'uppercase', fontSize:13 }}>
              {collections.length === 0 ? 'No collections yet.' : 'No results found.'}
            </p>
          ) : (
            <div style={{ 
              display:'grid', 
              gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', 
              gap:'48px 40px',
              paddingTop:12,
            }}>
              {pagedCollections.map((col, idx) => (
                <motion.div 
                  key={col.id || idx} 
                  whileHover="hover"
                  initial={{ opacity:0, y:30 }}
                  whileInView={{ opacity:1, y:0 }}
                  viewport={{ once:true, margin:'-40px' }}
                  transition={{ duration:0.8, delay: (idx % 3) * 0.15, ease:[0.16,1,0.3,1] }}
                  className="coll-card"
                  onClick={() => navigate(`/gallery/${col.slug || col.name.toLowerCase().replace(/ /g, '-')}`)}
                  style={{ 
                    position:'relative',
                    marginTop: idx % 2 === 1 ? 24 : 0, // asymmetrical height stagger for editorial vibe
                  }}
                >
                  {/* Passe-Partout Framed Container in Dark Mode */}
                  <div style={{ 
                    aspectRatio:'4/3', 
                    overflow:'hidden', 
                    borderRadius:4, 
                    background:'#121212',
                    border:'1px solid rgba(255,255,255,0.06)',
                    padding:16, // physical mat board spacing
                    boxShadow:'0 20px 40px rgba(0,0,0,0.3)',
                    transition:'all 0.5s cubic-bezier(0.16,1,0.3,1)',
                  }}>
                    <div style={{ width:'100%', height:'100%', overflow:'hidden', borderRadius:2, position:'relative' }}>
                      <img src={col.cover_url || col.cover || 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&q=60'}
                        alt={col.name} className="coll-img" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    </div>
                  </div>

                  {/* Title & Info Block */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginTop:18, padding:'0 4px' }}>
                    <div>
                      <h4 className="coll-title" style={{ 
                        margin:0, 
                        fontSize:18, 
                        fontWeight:400, 
                        letterSpacing:'0.04em', 
                        color:'#fff',
                        fontFamily:"'EB Garamond',serif",
                        textTransform:'none',
                      }}>
                        {col.name}
                      </h4>
                      {col.event_date && (
                        <div className="coll-date" style={{ fontSize:10, letterSpacing:'0.14em', color:'#8BDFDD', marginTop:6, textTransform:'uppercase', fontFamily:'sans-serif' }}>
                          {new Date(col.event_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                        </div>
                      )}
                    </div>
                    
                    {/* tactual arrow indicator */}
                    <motion.span 
                      variants={{ hover: { x: 4, opacity: 1 } }}
                      initial={{ x: -4, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ color:'#8BDFDD', fontFamily:"'EB Garamond',serif", fontSize:20, alignSelf:'center' }}
                    >
                      →
                    </motion.span>
                  </div>
                </motion.div>
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
        background: '#fbfaf7', zIndex: 10,
        transform: `translateY(${whiteY}vh)`,
        transition: 'none',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        pointerEvents: panelProgress > 0.95 ? 'none' : 'auto',
      }}>
        {/* White nav */}
        <div style={{ padding:'36px 64px 0', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, zIndex:10 }}>
          <span style={{ fontFamily:"'EB Garamond',serif", fontSize:18, fontWeight:500, letterSpacing:'0.28em', textTransform:'uppercase', color:'#111' }}>{photographerName}</span>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontFamily:'sans-serif', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', color:'#bbb' }}>Professional Portfolio</span>
          </div>
        </div>

        {/* Main editorial layout */}
        <div style={{ flex:1, display:'flex', padding:'0 64px 48px', position:'relative', zIndex:1, overflow:'hidden' }}>
          
          {/* Subtle grid lines background */}
          <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, display:'flex', pointerEvents:'none', opacity:0.4, zIndex:0 }}>
            <div style={{ flex:1, borderRight:'1px solid rgba(0,0,0,0.03)' }} />
            <div style={{ flex:1, borderRight:'1px solid rgba(0,0,0,0.03)' }} />
            <div style={{ flex:1, borderRight:'1px solid rgba(0,0,0,0.03)' }} />
            <div style={{ flex:1 }} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:48, width:'100%', position:'relative', zIndex:2 }}>
            
            {/* LEFT COLUMN: Texts and info */}
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', zIndex:2, paddingLeft:32 }}>
              
              {/* Giant Editorial Greeting */}
              <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ duration:1.3, ease:[0.16,1,0.3,1] }}>
                <h1 style={{ 
                  fontFamily:"'EB Garamond',serif", 
                  fontWeight:400, 
                  fontSize:'clamp(42px, 5.5vw, 72px)', 
                  lineHeight:1.05, 
                  letterSpacing:'-0.03em', 
                  color:'#111', 
                  margin:0,
                  textTransform:'lowercase'
                }}>
                  hello,<br />
                  welcome to the<br />
                  <span style={{ color:'#333', fontFamily:"'EB Garamond',serif", fontWeight:400 }}>creative showcase</span>
                </h1>
              </motion.div>

              {/* Minimal Separator Line with Entrance Width Animation */}
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: '100%' }} 
                transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ height:1, background: 'linear-gradient(to right, #8BDFDD, transparent)', marginTop:36, marginBottom:36, maxWidth:360 }} 
              />

              {/* Bio block */}
              {(() => {
                const bioText = profile.show_bio !== false && (profile.biography || profile.bio);
                if (!bioText) return null;
                return (
                  <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5, duration:0.9 }}
                    style={{ marginBottom:40 }}>
                    <p style={{ fontFamily:"'EB Garamond',serif", fontSize:20, lineHeight:1.75, color:'#555', maxWidth:520, margin:0, fontWeight:400 }}>
                      {bioText}
                    </p>
                  </motion.div>
                );
              })()}

              {/* Stats & Info row — Museum Label Grid */}
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.75, duration:0.9 }}
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap:24, width: '100%', maxWidth: 480 }}>
                {sortedCollections.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
                    <span style={{ fontFamily:'sans-serif', fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:'#8BDFDD', display:'block', marginBottom:8 }}>01 // exhibits</span>
                    <div style={{ fontFamily:"'EB Garamond',serif", fontSize:32, fontWeight:400, color:'#111', lineHeight:1 }}>
                      {sortedCollections.length} <span style={{ fontSize:16, color:'#888' }}>Galleries</span>
                    </div>
                  </div>
                )}
                {profile.show_address !== false && (profile.address_line_1 || profile.city) && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
                    <span style={{ fontFamily:'sans-serif', fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:'#8BDFDD', display:'block', marginBottom:8 }}>02 // based in</span>
                    <div style={{ fontFamily:"'EB Garamond',serif", fontSize:18, fontWeight:400, color:'#333', lineHeight:1.3 }}>
                      {profile.city || profile.address_line_1}
                      {profile.state_province && <span style={{ color:'#888', display:'block', fontSize:13 }}>{profile.state_province}</span>}
                    </div>
                  </div>
                )}
                {profile.show_phone !== false && profile.phone && (
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 16 }}>
                    <span style={{ fontFamily:'sans-serif', fontSize:8, letterSpacing:'0.2em', textTransform:'uppercase', color:'#8BDFDD', display:'block', marginBottom:8 }}>03 // contact</span>
                    <div style={{ fontFamily:"'EB Garamond',serif", fontSize:18, fontWeight:400, color:'#333', lineHeight:1 }}>
                      {profile.phone}
                    </div>
                  </div>
                )}
              </motion.div>

            </div>

            {/* RIGHT COLUMN: Dynamic Stacked Asymmetrical Shutter-Reveal Collage */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', position:'relative', height:'100%', zIndex:2, paddingRight: 48 }}>
              
              {/* Collage Frame Container */}
              <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: 440,
                height: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>

                {/* --- IMAGE 3 (Back-Right Card, if available) --- */}
                {collageImages[2] && (
                  <motion.div
                    initial={{ opacity:0, scale:0.8, rotate:0 }}
                    animate={{ opacity:1, scale:1, rotate:8 }}
                    transition={{ delay:0.7, duration:1.2, ease:[0.16,1,0.3,1] }}
                    style={{
                      position: 'absolute',
                      width: '65%',
                      height: '48vh',
                      bottom: '5%',
                      right: '-10%',
                      zIndex: 1,
                      overflow: 'hidden',
                      borderRadius: 12,
                      boxShadow: '0 15px 45px rgba(0,0,0,0.1)',
                      border: '1px solid rgba(0,0,0,0.04)',
                    }}
                  >
                    <img src={collageImages[2]} alt="collage-3" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    {/* Shutter Reveal Blind */}
                    <motion.div
                      initial={{ height: '100%' }}
                      animate={{ height: '0%' }}
                      transition={{ delay: 0.8, duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#fbfaf7', zIndex: 3 }}
                    />
                  </motion.div>
                )}

                {/* --- IMAGE 2 (Back-Left Card, if available) --- */}
                {collageImages[1] && (
                  <motion.div
                    initial={{ opacity:0, scale:0.8, rotate:0 }}
                    animate={{ opacity:1, scale:1, rotate:-6 }}
                    transition={{ delay:0.5, duration:1.2, ease:[0.16,1,0.3,1] }}
                    style={{
                      position: 'absolute',
                      width: '75%',
                      height: '52vh',
                      top: '5%',
                      left: '-15%',
                      zIndex: 2,
                      overflow: 'hidden',
                      borderRadius: 12,
                      boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
                      border: '1px solid rgba(0,0,0,0.04)',
                    }}
                  >
                    <img src={collageImages[1]} alt="collage-2" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    {/* Shutter Reveal Blind */}
                    <motion.div
                      initial={{ height: '100%' }}
                      animate={{ height: '0%' }}
                      transition={{ delay: 0.6, duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#fbfaf7', zIndex: 3 }}
                    />
                  </motion.div>
                )}

                {/* --- IMAGE 1 (Main Foreground Card) --- */}
                <motion.div 
                  initial={{ opacity:0, scale:0.9, y:30 }}
                  animate={{ opacity:1, scale:1, y:0 }}
                  transition={{ delay:0.2, duration:1.4, ease:[0.16,1,0.3,1] }}
                  style={{
                    width: collageImages.length > 1 ? '85%' : '100%',
                    height: '60vh',
                    position: 'relative',
                    zIndex: 3,
                    overflow: 'hidden',
                    borderRadius: 12,
                    boxShadow: '0 30px 80px rgba(0,0,0,0.15), 0 10px 30px rgba(0,0,0,0.05)',
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Ken Burns zooming container */}
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.06, 1],
                      x: [0, -4, 0],
                      y: [0, -2, 0]
                    }}
                    transition={{ 
                      duration: 20, 
                      repeat: Infinity, 
                      repeatType: "reverse",
                      ease: "easeInOut" 
                    }}
                    style={{ width:'100%', height:'100%', background:'#f4f4f4' }}
                  >
                    {collageImages[0] ? (
                      <img src={collageImages[0]} alt={coverName} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    ) : (
                      // Camera placeholder
                      <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color:'#bbb', background:'#faf9f6' }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                          <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <span style={{ fontSize:11, letterSpacing:'0.28em', textTransform:'uppercase', color:'#bbb', fontFamily:'sans-serif' }}>Pixnxt Studio</span>
                      </div>
                    )}
                  </motion.div>

                  {/* Shutter Reveal Blind */}
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ delay: 0.4, duration: 1.5, ease: [0.76, 0, 0.24, 1] }}
                    style={{
                      position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
                      background: '#fbfaf7', zIndex: 3,
                    }}
                  />

                  {/* Glassmorphic Exhibition Tag */}
                  <div style={{
                    position:'absolute', bottom:24, left:24, right:24,
                    background:'rgba(255,255,255,0.85)',
                    backdropFilter:'blur(12px)',
                    padding:'16px 20px',
                    borderRadius:8,
                    border:'1px solid rgba(255,255,255,0.4)',
                    zIndex:4,
                    boxShadow:'0 10px 30px rgba(0,0,0,0.05)',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontFamily:'sans-serif', fontSize:8, letterSpacing:'0.24em', textTransform:'uppercase', color:'#8BDFDD', fontWeight:600 }}>
                        {collageImages[0] ? 'exhibition index' : 'studio index'}
                      </span>
                      {coverDate && (
                        <span style={{ fontFamily:"'EB Garamond',serif", fontSize:11, fontStyle:'italic', color:'#666' }}>
                          {coverDate}
                        </span>
                      )}
                    </div>
                    <h3 style={{ 
                      fontFamily:"'EB Garamond',serif", 
                      fontSize:18, 
                      fontWeight:400, 
                      color:'#111', 
                      margin:'6px 0 0', 
                      letterSpacing:'0.04em',
                      textTransform:'lowercase',
                    }}>
                      {coverName}
                    </h3>
                  </div>

                </motion.div>

              </div>
            </div>

          </div>
        </div>

        {/* Vertical Editorial Indicator (Scroll for Galleries) */}
        <div style={{
          position: 'absolute',
          right: -40,
          top: '55%',
          transform: 'translateY(-50%) rotate(90deg)',
          transformOrigin: 'center center',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          zIndex: 10,
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.7,
        }}>
          <span style={{
            fontFamily: 'sans-serif',
            fontSize: 9,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: '#888',
            fontWeight: 500,
            whiteSpace: 'nowrap'
          }}>
            scroll through galleries
          </span>
          <motion.div
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 32,
              height: 1,
              background: '#8BDFDD',
            }}
          />
        </div>

      </div>

      {/* Spacer so page is scrollable */}
      <div style={{ height:'200vh' }} />
    </div>
  );
};

export default CollectionList;
