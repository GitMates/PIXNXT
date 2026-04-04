import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Share2, Download, Heart, Play } from 'lucide-react';
import { GalleryHero } from '../../components/ui/GalleryHero';
import { MasonryGrid } from '../../components/ui/MasonryGrid';
import { Lightbox } from '../../components/ui/Lightbox';
import { galleryService } from '../../services/gallery.service';
import { cn } from '../../lib/utils';

const GalleryView = () => {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHero, setShowHero] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const galleryRef = useRef(null);

  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [600, 800], [0, 1]);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const data = await galleryService.getCollectionBySlug(slug);
        
        if (!data) {
          setError('Collection not found');
          return;
        }

        setCollection(data);
        
        if (data.photographer_id) {
          const p = await galleryService.getPhotographerProfile(data.photographer_id);
          setPhotographer(p);
        }
      } catch (err) {
        console.error('Gallery Fetch Error:', err);
        setError(err.message || 'An error occurred while loading the gallery');
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchGallery();
  }, [slug]);

  const scrollToGallery = () => {
    galleryRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-2xl font-light tracking-widest uppercase text-gray-300"
      >
        PIXNXT
      </motion.div>
    </div>
  );

  if (error || !collection) return (
    <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-medium mb-4">Gallery Not Found</h2>
      <p className="text-gray-500 mb-8">The collection you are looking for does not exist or is private.</p>
      <a href="/" className="text-sm font-medium underline uppercase tracking-widest">Back to Home</a>
    </div>
  );

  const photoUrls = collection.photos?.map(p => p.full_url || p.web_url || p.thumbnail_url) || [];

  // Map design tokens from individual Supabase columns
  const fontClass = collection.font_family === 'serif' ? 'font-serif' : 'font-sans';
  
  // Advanced color mapping
  const palette = collection.color_palette || 'light';
  const isDark = palette === 'dark';
  
  const bgColor = isDark ? 'bg-[#111111]' : (palette === 'gold' ? 'bg-[#faf7f2]' : 'bg-white');
  const textColor = isDark ? 'text-white' : 'text-zinc-900';
  const borderColor = isDark ? 'border-zinc-800' : 'border-zinc-100';

  return (
    <div className={cn("min-h-screen transition-colors duration-700", fontClass, bgColor, textColor, "selection:bg-black selection:text-white")}>
      {/* Hero Section */}
      <GalleryHero 
        title={collection.name}
        date={collection.event_date}
        coverImage={collection.cover_url || (collection.photos?.[0]?.web_url)}
        onEnter={scrollToGallery}
      />

      {/* Sticky Header */}
      <motion.header 
        style={{ opacity: headerOpacity }}
        className={cn(
          "fixed top-0 z-50 flex h-16 w-full items-center justify-between px-6 backdrop-blur-md border-b",
          collection.color_palette === 'dark' ? "bg-zinc-950/80 border-zinc-800" : "bg-white/80 border-zinc-100"
        )}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold tracking-tighter uppercase">{collection.name}</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase hover:opacity-60 transition-opacity">
            <Play size={12} fill="currentColor" /> Slideshow
          </button>
          <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase hover:opacity-60 transition-opacity">
            <Share2 size={12} /> Share
          </button>
          <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase hover:opacity-60 transition-opacity">
            <Download size={12} /> Download
          </button>
          <button className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase hover:opacity-60 transition-opacity">
            <Heart size={12} /> Favorite
          </button>
        </div>
      </motion.header>

      {/* Main Gallery Content */}
      <main ref={galleryRef} className="container mx-auto px-6 py-20">
        {/* Sets Navigation */}
        <div className="mb-12 flex items-center justify-center gap-10">
          <button className="relative text-xs font-bold tracking-[0.2em] uppercase after:absolute after:-bottom-2 after:left-0 after:h-[1px] after:w-full after:bg-black">
            Highlights
          </button>
          <button className="text-xs font-bold tracking-[0.2em] uppercase text-gray-400 hover:text-black transition-colors">
            All Photos
          </button>
        </div>

        {/* Masonry Grid */}
        <MasonryGrid 
          images={photoUrls}
          onImageClick={(index) => setLightboxIndex(index)}
        />
      </main>

      {/* Footer */}
      <footer className="mt-40 border-t border-gray-100 py-12 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <p className="text-[10px] tracking-[0.3em] font-bold uppercase text-gray-400 mb-2">Photographer</p>
            <h3 className="text-sm font-bold tracking-tighter uppercase">
              {photographer?.display_name || photographer?.name || "PIXNXT STUDIO"}
            </h3>
          </div>
          <div className="flex items-center gap-8 text-[10px] font-bold tracking-widest uppercase">
            <a href="#" className="hover:opacity-40 transition-opacity">Contact</a>
            <a href="#" className="hover:opacity-40 transition-opacity">Website</a>
            <a href="#" className="hover:opacity-40 transition-opacity">Instagram</a>
          </div>
        </div>
      </footer>

      {/* Lightbox */}
      <Lightbox 
        isOpen={lightboxIndex !== -1}
        onClose={() => setLightboxIndex(-1)}
        images={photoUrls}
        currentIndex={lightboxIndex}
        onNext={() => setLightboxIndex((prev) => (prev + 1) % photoUrls.length)}
        onPrev={() => setLightboxIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length)}
      />
    </div>
  );
};

export default GalleryView;
