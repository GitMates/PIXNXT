import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { galleryService } from '../../services/gallery.service';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

const CollectionList = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        // We'll use a hardcoded photographer ID for now or fetch it from context
        const data = await galleryService.getPublicCollections('default-id');
        setCollections(data);
      } catch (err) {
        console.error(err);
        // Fallback to localStorage
        const saved = localStorage.getItem('pixnxt_collections');
        if (saved) {
          setCollections(JSON.parse(saved));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-sm font-bold tracking-[0.4em] uppercase text-gray-200">PIXNXT</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 selection:bg-black selection:text-white">
      {/* Landing Header */}
      <header className="container mx-auto px-6 py-20 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tighter uppercase">CLIENT GALLERIES</h1>
        <p className="text-sm tracking-widest text-gray-400 uppercase font-medium">PIXNXT STUDIO</p>
      </header>

      {/* Collections Grid */}
      <main className="container mx-auto px-6 pb-40">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              key={collection.id || idx}
              className="group cursor-pointer"
              onClick={() => navigate(`/gallery/${collection.slug || collection.name.toLowerCase().replace(/ /g, '-')}`)}
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100 rounded-sm">
                <img 
                  src={collection.cover_url || collection.cover || "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&auto=format&fit=crop&q=60"} 
                  alt={collection.name} 
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 transition-all duration-500 group-hover:bg-black/20" />
                
                {/* View Gallery Button Overlay */}
                <div className="absolute inset-x-0 bottom-0 py-12 text-center translate-y-full transition-transform duration-500 group-hover:translate-y-0">
                   <span className="inline-block border border-white px-8 py-3 text-[10px] font-bold tracking-widest text-white uppercase hover:bg-white hover:text-black transition-all">
                     View Gallery
                   </span>
                </div>
              </div>

              <div className="mt-8 text-center">
                <h3 className="mb-2 text-sm font-bold tracking-tight uppercase group-hover:tracking-widest transition-all">
                  {collection.name}
                </h3>
                <div className="flex items-center justify-center gap-4 text-[10px] font-medium tracking-widest text-gray-400 uppercase">
                  <span>{collection.event_date}</span>
                  <span className="h-1 w-1 rounded-full bg-gray-200" />
                  <span>{collection.photo_count || 0} items</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {collections.length === 0 && (
          <div className="py-40 text-center">
             <p className="text-sm tracking-widest text-gray-400 uppercase">No collections available yet.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="container mx-auto flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <h3 className="text-xl font-bold tracking-tighter uppercase mb-2">PIXNXT</h3>
            <p className="text-[10px] tracking-[0.2em] font-medium text-gray-400 uppercase">© 2026 PIXNXT STUDIO</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CollectionList;
