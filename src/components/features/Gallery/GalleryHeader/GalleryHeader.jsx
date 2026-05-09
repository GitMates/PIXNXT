import React from 'react';
import { motion } from 'framer-motion';
import { Share2, Download, Heart, Play, ChevronLeft } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { Button } from '../../../ui/Button';
import { Typography } from '../../../ui/Typography';

export function GalleryHeader({ title, opacity, isDark, onSlideshow, onFavorite, onDownload, onShare }) {
  return (
    <motion.header
      style={{ opacity }}
      className={cn(
        "fixed top-0 z-50 flex h-16 w-full items-center justify-between px-6 backdrop-blur-md border-b transition-colors duration-500",
        isDark ? "bg-black/80 border-white/10 text-white" : "bg-white/80 border-black/5 text-black"
      )}
      style={{ 
        backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
        color: 'var(--gallery-text)',
        borderBottomColor: 'rgba(0,0,0,0.05)',
        opacity
      }}
    >
      <div className="flex items-center gap-4">
        <Typography variant="label" className="hidden md:block opacity-50">Collection</Typography>
        <Typography variant="h4" className="text-sm font-bold tracking-tighter uppercase">{title}</Typography>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <HeaderAction
          icon={<Play size={14} fill="currentColor" />}
          label="Slideshow"
          onClick={onSlideshow}
          hideMobile
        />
        <HeaderAction
          icon={<Share2 size={14} />}
          label="Share"
          onClick={onShare}
        />
        <HeaderAction
          icon={<Download size={14} />}
          label="Download"
          onClick={onDownload}
        />
        <HeaderAction
          icon={<Heart size={14} />}
          label="Favorite"
          onClick={onFavorite}
        />
      </div>
    </motion.header>
  );
}

function HeaderAction({ icon, label, onClick, hideMobile }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase hover:opacity-40 transition-all",
        hideMobile && "hidden md:flex"
      )}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
