import React, { useState, useEffect } from 'react';
import { X, Upload, FlaskConical, LayoutDashboard, Eye, ShoppingCart, Package } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';

export default function LeftSidebar({ isOpen, onClose, onSeeGallery, onGoToCart, onGoToOrders, photographer }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [photographerName, setPhotographerName] = useState(photographer?.display_name || '');

  useEffect(() => {
    if (photographer?.display_name) {
      setPhotographerName(photographer.display_name);
    }
  }, [photographer]);

  useEffect(() => {
    async function fetchPhotographerName() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: photoProfile } = await supabase
            .from('photographers')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle();
          if (photoProfile?.display_name) {
            setPhotographerName(photoProfile.display_name);
          }
        } else {
          // As a fallback, get first photographer in database
          const { data: photoProfiles } = await supabase
            .from('photographers')
            .select('display_name')
            .limit(1);
          if (photoProfiles?.[0]?.display_name) {
            setPhotographerName(photoProfiles[0].display_name);
          }
        }
      } catch (err) {
        console.error("Error loading photographer name:", err);
      }
    }

    if (isOpen && !photographer?.display_name) {
      fetchPhotographerName();
    }
  }, [isOpen, photographer]);

  if (!isOpen) return null;

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Collection link copied to clipboard!");
  };

  const handleGoToLab = () => {
    onClose();
    navigate('/lab');
  };

  const handleGoToDashboard = () => {
    onClose();
    navigate('/dashboard');
  };

  const handleSeeGallery = () => {
    onClose();
    const slug = searchParams.get('slug') || searchParams.get('collection');
    if (slug) {
      navigate(`/gallery/${slug}`);
    } else if (onSeeGallery) {
      onSeeGallery();
    }
  };

  const handleGoToCart = () => {
    onClose();
    if (onGoToCart) onGoToCart();
  };

  const handleGoToOrders = () => {
    onClose();
    if (onGoToOrders) onGoToOrders();
  };

  return (
    <div className="menu-drawer-overlay" onClick={onClose}>
      <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
        {/* Header Actions Bar */}
        <div className="menu-drawer-header-actions">
          <button 
            className="menu-drawer-close-btn" 
            onClick={onClose} 
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Branding Photographer Title */}
        <h3 className="menu-drawer-title">{photographerName}</h3>

        {/* See Gallery button */}
        <button className="menu-drawer-share-btn" onClick={handleSeeGallery}>
          <Eye size={18} strokeWidth={1.5} />
          <span>See gallery</span>
        </button>

        {/* Go to my orders button */}
        <button className="menu-drawer-share-btn" onClick={handleGoToOrders} style={{ marginTop: '10px' }}>
          <Package size={18} strokeWidth={1.5} />
          <span>Go to my orders</span>
        </button>

        {/* Go to cart button */}
        <button className="menu-drawer-share-btn" onClick={handleGoToCart} style={{ marginTop: '10px' }}>
          <ShoppingCart size={18} strokeWidth={1.5} />
          <span>Go to cart</span>
        </button>

        {/* Go to dashboard button */}
        <button className="menu-drawer-share-btn" onClick={handleGoToDashboard} style={{ marginTop: '10px' }}>
          <LayoutDashboard size={18} strokeWidth={1.5} />
          <span>Go to dashboard</span>
        </button>

        {/* See Lab button */}
        <button className="menu-drawer-share-btn" onClick={handleGoToLab} style={{ marginTop: '10px' }}>
          <FlaskConical size={18} strokeWidth={1.5} />
          <span>See lab</span>
        </button>

        {/* Share gallery button */}
        <button className="menu-drawer-share-btn" onClick={handleShareClick} style={{ marginTop: '10px' }}>
          <Upload size={18} strokeWidth={1.5} />
          <span>Share gallery</span>
        </button>
      </div>
    </div>
  );
}
