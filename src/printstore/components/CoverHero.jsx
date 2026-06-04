import React, { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CoverHero({ onExplore }) {
  const leftRef = useRef(null);
  const rightRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const sy = window.scrollY;
      if (leftRef.current) {
        leftRef.current.style.transform = `translateY(${-sy}px)`;
      }
      if (rightRef.current) {
        rightRef.current.style.transform = `translateY(${-sy * 0.5}px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial offset paint
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="cover-hero-container">
      {/* Left Vertical Info Banner */}
      <div className="cover-hero-left" ref={leftRef}>
        <div style={{ fontSize: '0.85rem', tracking: '0.2em', color: 'var(--gallery-meta-text, #777777)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Pixnxt Studio
        </div>
        <h1 
          id="gallery-name"
          className="vertical-branding cover-title"
          style={{
            lineHeight: 0.9,
            fontSize: '137.333px',
            fontFamily: 'europa, sans-serif',
            textTransform: 'uppercase',
            color: '#222222',
            fontWeight: 500,
            whiteSpace: 'nowrap'
          }}
        >
          Kharthik Baskaran
        </h1>
        <div className="cover-hero-date">
          April 28, 2026
        </div>
      </div>

      {/* Right Hero Image Fold */}
      <div className="cover-hero-right" ref={rightRef}>
        <img
          src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=1200&h=1800"
          alt="Kharthik Hero Portrait"
          className="cover-hero-image"
        />


      </div>
    </div>
  );
}

