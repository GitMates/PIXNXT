import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { galleryService } from '../../services/gallery.service';
import { useNavigate } from 'react-router-dom';
import { sortCollections } from '../../utils/sortCollections';

const ITEMS_PER_PAGE = 12;

const CollectionList = ({ slug }) => {
  const [profile, setProfile] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Password protection state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const gridRef = useRef(null);
  
  const navigate = useNavigate();
  const [layoutMode, setLayoutMode] = useState('grid');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset body theme and scroll when navigating back from gallery
  useEffect(() => {
    document.body.classList.remove('dark-theme');
    document.body.style.backgroundColor = '#ffffff';
    document.documentElement.style.backgroundColor = '#ffffff';
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
        if (!slug) throw new Error("No photographer slug provided");

        const photographerData = await galleryService.getPhotographerProfileBySlug(slug);
        
        if (!photographerData) {
          throw new Error("Photographer not found");
        }
        
        setProfile(photographerData);
        
        // Only fetch collections if homepage is enabled
        if (photographerData.homepage_enabled !== false) {
            const collectionsData = await galleryService.getPublicCollections(photographerData.id);
            setCollections(collectionsData || []);
        }
      } catch (err) {
        console.error(err);
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

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent"></div>
    </div>
  );

  if (error || !profile) return (
    <div className="flex h-screen flex-col items-center justify-center bg-white">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">Portfolio Not Found</h1>
      <p className="text-sm text-gray-500">The page you're looking for doesn't exist or is currently unavailable.</p>
    </div>
  );

  if (profile.homepage_enabled === false) return (
    <div className="flex h-screen flex-col items-center justify-center bg-white">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">Coming Soon</h1>
      <p className="text-sm text-gray-500">This photographer's portfolio is currently being updated.</p>
    </div>
  );

  // Check Password
  if (profile.homepage_password && !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fafafa]">
        <div className="w-full max-w-md bg-white p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-lg text-center">
          <div className="mb-6 mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Password Required</h2>
          <p className="text-sm text-gray-500 mb-8">Please enter the password to view this portfolio.</p>
          <form onSubmit={handlePasswordSubmit}>
            <input 
              type="password" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className={`w-full bg-gray-50 border ${passwordError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-gray-900'} px-4 py-3 rounded outline-none transition-colors mb-4`}
              autoFocus
            />
            {passwordError && <p className="text-xs text-red-500 mb-4 text-left">Incorrect password. Please try again.</p>}
            <button type="submit" className="w-full bg-gray-900 text-white font-medium py-3 rounded hover:bg-black transition-colors">
              Enter Portfolio
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Derived Info
  const photographerName = profile.business_name || (profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : slug);

  const filteredCollections = collections
    .filter(c => c.status === 'published' && c.show_on_homepage !== false)
    .filter(collection =>
      collection.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const sortedCollections = sortCollections(filteredCollections, profile?.homepage_sort || 'created-new');

  // Pagination logic
  const totalPages = Math.ceil(sortedCollections.length / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const pagedCollections = sortedCollections.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const goToPage = (page) => {
    setCurrentPage(page);
    // Scroll to top of grid smoothly
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Reset to page 1 when search changes — handled inline via safePage
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#222] portfolio-wrapper pb-24">
      <style>{`
        /* Custom Elegant Scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #fafafa;
        }
        ::-webkit-scrollbar-thumb {
            background: #e2e2e2;
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #cccccc;
        }

        .portfolio-wrapper {
            font-family: 'EB Garamond', serif !important;
            background-color: #fafafa !important;
        }

        .portfolio-wrapper * {
            font-family: 'EB Garamond', serif !important;
        }

        .collection-card-image-container {
            position: relative;
            overflow: hidden;
            background-color: #f3f3f3;
            border: 1px solid rgba(0, 0, 0, 0.04);
            transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .collection-card-image-container::after {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.015);
            transition: opacity 0.4s ease;
        }

        .group:hover .collection-card-image-container::after {
            opacity: 0;
        }

        .collection-card-title {
            position: relative;
            display: inline-block;
            padding-bottom: 2px;
        }

        .collection-card-title::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 0;
            height: 1.5px;
            background-color: #111;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            transform: translateX(-50%);
        }

        .group:hover .collection-card-title::after {
            width: 100%;
        }

        /* Glassmorphic Navbar transition */
        .scrolled-nav {
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            background-color: rgba(250, 250, 250, 0.8) !important;
            border-bottom: 1px solid rgba(0, 0, 0, 0.04) !important;
            height: 4.5rem !important;
        }
      `}</style>

      {/* Top Navigation (Minimalist Glassmorphic Sticky Header) */}
      <nav className={`w-full h-24 flex justify-between items-center px-10 sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'scrolled-nav shadow-[0_2px_20px_-5px_rgba(0,0,0,0.015)]' : 'bg-transparent'}`}>
        {/* Left Side: Brand Name appearing dynamically on scroll */}
        <div className="flex items-center">
          {scrolled && (
            <span className="text-[8px] font-semibold tracking-[0.2em] text-[#111] uppercase animate-[cgFadeIn_0.3s_ease] select-none">
              {photographerName}
            </span>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center">
          {/* Search bar input slider */}
          <div className={`flex items-center overflow-hidden transition-all duration-300 ${isSearchOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'}`}>
             <input 
               type="text" 
               autoFocus={isSearchOpen}
               value={searchQuery}
               onChange={(e) => handleSearchChange(e.target.value)}
               placeholder="Search collections..." 
               className="w-full border-b border-gray-300 py-1.5 outline-none text-[9px] bg-transparent placeholder-gray-400 focus:border-gray-900 transition-colors mr-4"
             />
          </div>

          {/* Layout Mode Switcher Toggle */}
          <button
             onClick={() => setLayoutMode(prev => prev === 'grid' ? 'list' : 'grid')}
             className="text-gray-400 hover:text-gray-900 transition-colors mr-6 flex items-center justify-center"
             title={layoutMode === 'grid' ? "Switch to Editorial List View" : "Switch to Grid View"}
          >
             {layoutMode === 'grid' ? (
                /* List Icon */
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
             ) : (
                /* Grid Icon */
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
             )}
          </button>

          {/* Search Trigger Button */}
          <button 
             onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) handleSearchChange('');
             }} 
             className={`${isSearchOpen ? 'text-gray-900' : 'text-gray-400'} hover:text-gray-900 transition-colors z-10 flex items-center justify-center`}
          >
            {isSearchOpen ? (
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            )}
          </button>
        </div>
      </nav>
      {/* Photographer Header */}
      <header className="container mx-auto px-6 pt-16 pb-20 text-center max-w-4xl">
        {profile.profile_icon_url && (
           <div className="mb-8 flex justify-center">
              <img 
                 src={profile.profile_icon_url} 
                 alt={photographerName} 
                 className="w-20 h-20 rounded-full object-cover border border-[#eaeaea] shadow-sm" 
              />
           </div>
        )}
        
        <h1 className="mb-8 text-[28px] font-light tracking-[0.18em] text-[#111] uppercase leading-tight">
           {photographerName}
        </h1>
        
        {/* Contact Info (Sleek Centered Horizontal List) */}
        <div className="flex flex-wrap justify-center items-center gap-y-3.5 text-[9px] text-[#666] uppercase tracking-[0.08em] font-medium">
           {profile.show_phone !== false && profile.phone && (
              <div className="flex items-center hover:text-black transition-colors px-3">
                 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0 mr-2 translate-y-[1px]">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                 </svg>
                 <a href={`tel:${profile.phone.trim()}`}>{profile.phone.trim()}</a>
              </div>
           )}
           {profile.show_phone !== false && profile.phone && profile.show_email !== false && profile.contact_email && (
              <span className="text-gray-300 select-none text-[6px]">•</span>
           )}
           {profile.show_email !== false && profile.contact_email && (
              <div className="flex items-center hover:text-black transition-colors px-3">
                 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0 mr-2 translate-y-[1.5px]">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                 </svg>
                 <a href={`mailto:${profile.contact_email.trim()}`} className="lowercase tracking-normal">{profile.contact_email.trim()}</a>
              </div>
           )}
           {((profile.show_phone !== false && profile.phone) || (profile.show_email !== false && profile.contact_email)) && profile.show_website !== false && profile.website && (
              <span className="text-gray-300 select-none text-[6px]">•</span>
           )}
           {profile.show_website !== false && profile.website && (
              <div className="flex items-center hover:text-black transition-colors px-3">
                 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0 mr-2 translate-y-[1px]">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                 </svg>
                 <a href={profile.website.trim().startsWith('http') ? profile.website.trim() : `https://${profile.website.trim()}`} target="_blank" rel="noreferrer">
                    {profile.website.trim().replace(/^https?:\/\//, '')}
                 </a>
              </div>
           )}
           {((profile.show_phone !== false && profile.phone) || (profile.show_email !== false && profile.contact_email) || (profile.show_website !== false && profile.website)) && profile.show_address !== false && profile.address_line_1 && (
              <span className="text-gray-300 select-none text-[6px]">•</span>
           )}
           {profile.show_address !== false && profile.address_line_1 && (
              <div className="flex items-center hover:text-black transition-colors px-3">
                 <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0 mr-2 translate-y-[1px]">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                 </svg>
                 <span>{[profile.address_line_1.trim(), profile.city ? profile.city.trim() : '', profile.state_province ? profile.state_province.trim() : ''].filter(Boolean).join(', ')}</span>
              </div>
           )}
        </div>

        {/* Bio (if toggled) */}
        {profile.show_bio !== false && profile.bio && (
           <p className="mt-8 text-[#555] leading-relaxed max-w-xl mx-auto text-[10px] font-normal tracking-wide border-t border-[#f0f0f0] pt-6">
              {profile.bio}
           </p>
        )}

        {/* Social Links (if toggled) */}
        {profile.show_social !== false && (
           <div className="flex justify-center items-center gap-6 mt-8 text-gray-400">
               {profile.social_facebook && (
                  <a href={profile.social_facebook} target="_blank" rel="noreferrer" className="hover:text-gray-900 transition-colors">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  </a>
               )}
               {profile.social_instagram && (
                  <a href={profile.social_instagram} target="_blank" rel="noreferrer" className="hover:text-gray-900 transition-colors">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </a>
               )}
               {profile.social_x_twitter && (
                  <a href={profile.social_x_twitter} target="_blank" rel="noreferrer" className="hover:text-gray-900 transition-colors">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg>
                  </a>
               )}
           </div>
        )}
      </header>

      {/* Collections Grid / List */}
      <main ref={gridRef} className="container mx-auto px-10 pb-16 max-w-7xl transition-all duration-500">
        {layoutMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-x-10 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {pagedCollections.map((collection, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (idx % 3) * 0.1, duration: 0.6 }}
              key={collection.id || idx}
              className="group cursor-pointer flex flex-col items-center"
              onClick={() => navigate(`/gallery/${collection.slug || collection.name.toLowerCase().replace(/ /g, '-')}`)}
            >
              <div className="w-full h-auto collection-card-image-container mb-6 shadow-sm overflow-hidden">
                <img 
                  src={collection.cover_url || collection.cover || "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&auto=format&fit=crop&q=60"} 
                  alt={collection.name} 
                  className="w-full h-auto object-contain transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                />
              </div>

              <div className="text-center">
                <h3 className="mb-2 text-[9px] font-medium tracking-[0.14em] text-[#111] uppercase group-hover:text-black transition-colors collection-card-title">
                  {collection.name}
                </h3>
                {collection.event_date && (
                  <div className="text-[6px] font-normal tracking-[0.16em] text-[#888] uppercase mt-1">
                    {new Date(collection.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', 'th,')}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
          <div className="flex flex-col items-center gap-24 max-w-4xl mx-auto">
            {pagedCollections.map((collection, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                key={collection.id || idx}
                className="group cursor-pointer flex flex-col items-center w-full"
                onClick={() => navigate(`/gallery/${collection.slug || collection.name.toLowerCase().replace(/ /g, '-')}`)}
              >
                <div className="w-full h-auto collection-card-image-container mb-8 shadow-sm overflow-hidden">
                  <img 
                    src={collection.cover_url || collection.cover || "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&auto=format&fit=crop&q=60"} 
                    alt={collection.name} 
                    className="w-full h-auto object-contain transition-transform duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                  />
                </div>

                <div className="text-center">
                  <h3 className="mb-2 text-[11px] font-medium tracking-[0.16em] text-[#111] uppercase group-hover:text-black transition-colors collection-card-title">
                    {collection.name}
                  </h3>
                  {collection.event_date && (
                    <div className="text-[7px] font-normal tracking-[0.18em] text-[#888] uppercase mt-1">
                      {new Date(collection.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', 'th,')}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {sortedCollections.length === 0 && (
          <div className="py-20 text-center">
             <p className="text-[8px] tracking-widest text-[#999] uppercase">
                {collections.length === 0 ? "No public collections available yet." : "No collections match your search."}
             </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-20 mb-8 flex items-center justify-center gap-2">
            {/* Prev arrow */}
            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              className="w-9 h-9 flex items-center justify-center text-[#999] hover:text-[#222] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`w-9 h-9 flex items-center justify-center text-[8px] font-bold tracking-[0.08em] transition-colors
                  ${safePage === page
                    ? 'text-[#222] border-b-2 border-[#222]'
                    : 'text-[#bbb] hover:text-[#555]'
                  }`}
              >
                {page}
              </button>
            ))}

            {/* Next arrow */}
            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="w-9 h-9 flex items-center justify-center text-[#999] hover:text-[#222] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CollectionList;
