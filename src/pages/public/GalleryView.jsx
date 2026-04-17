import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useScroll, useTransform } from 'framer-motion';
import { GalleryHero } from '../../components/features/Gallery/GalleryHero/GalleryHero';
import { GalleryHeader } from '../../components/features/Gallery/GalleryHeader/GalleryHeader';
import { MasonryGrid } from '../../components/features/Gallery/MasonryGrid/MasonryGrid';
import { PhotoLightbox } from '../../components/features/Gallery/PhotoLightbox/PhotoLightbox';
import { galleryService } from '../../services/gallery.service';
import { cn } from '../../lib/utils';
import { Container } from '../../components/ui/Container';
import { Typography } from '../../components/ui/Typography';

const GalleryView = () => {
  const { slug } = useParams();
  const [collection, setCollection] = useState(null);
  const [photographer, setPhotographer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      <div className="text-sm font-bold tracking-[0.6em] uppercase text-zinc-200 animate-pulse">
        PIXNXT
      </div>
    </div>
  );

  if (error || !collection) return (
    <div className="flex h-screen flex-col items-center justify-center p-6 text-center bg-white">
      <Typography variant="h2" className="mb-4">Gallery Not Found</Typography>
      <Typography variant="muted" className="mb-8">The collection you are looking for does not exist or is private.</Typography>
      <a href="/" className="text-[10px] font-bold underline uppercase tracking-[0.4em]">Back to Home</a>
    </div>
  );

  const photoUrls = collection.photos?.map(p => p.full_url || p.web_url || p.thumbnail_url) || [];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <GalleryHero 
        title={collection.name}
        date={collection.event_date}
        coverImage={collection.cover_url || (collection.photos?.[0]?.web_url)}
        onEnter={scrollToGallery}
      />

      {/* Sticky Header */}
      <GalleryHeader 
        title={collection.name} 
        opacity={headerOpacity} 
        isDark={false} 
      />

      {/* Main Gallery Content */}
      <main ref={galleryRef} className="py-24">
        <Container>
          {/* Sets Navigation - Minimal Nova Style */}
          <div className="mb-16 flex items-center justify-center gap-12">
            <button className="group relative py-2">
              <Typography variant="label" className="text-zinc-900 opacity-100">Highlights</Typography>
              <div className="absolute bottom-0 left-0 h-[1.5px] w-full bg-zinc-950 scale-x-100 transition-transform origin-left" />
            </button>
            <button className="group relative py-2">
              <Typography variant="label" className="transition-opacity group-hover:opacity-100">All Photos</Typography>
              <div className="absolute bottom-0 left-0 h-[1.5px] w-full bg-zinc-950 scale-x-0 transition-transform origin-left group-hover:scale-x-100" />
            </button>
          </div>

          {/* Masonry Grid */}
          <MasonryGrid 
            images={photoUrls}
            onImageClick={(index) => setLightboxIndex(index)}
          />
        </Container>
      </main>

      {/* Global Footer Branding */}
      <footer className="mt-40 border-t border-zinc-100 py-24">
        <Container>
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="text-center md:text-left">
              <Typography variant="label" className="mb-4 block">Delivered by</Typography>
              <Typography variant="h3" className="uppercase tracking-tighter">
                {photographer?.display_name || photographer?.name || "PIXNXT STUDIO"}
              </Typography>
            </div>
            
            <div className="flex items-center gap-12">
              <FooterLink href="#">Portfolio</FooterLink>
              <FooterLink href="#">Contact</FooterLink>
              <FooterLink href="#">Instagram</FooterLink>
            </div>
          </div>
          
          <div className="mt-24 text-center">
            <Typography variant="label" className="opacity-20">© {new Date().getFullYear()} PIXNXT. All Rights Reserved.</Typography>
          </div>
        </Container>
      </footer>

      {/* Lightbox */}
      <PhotoLightbox 
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

function FooterLink({ href, children }) {
  return (
    <a 
      href={href} 
      className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-950 transition-colors"
    >
      {children}
    </a>
  );
}

export default GalleryView;
