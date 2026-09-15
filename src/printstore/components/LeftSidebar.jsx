import React, { useState, useEffect } from 'react';
import { X, Upload, FlaskConical, LayoutDashboard, Eye, ShoppingCart, Package, Camera, Bell } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api/client';

export default function LeftSidebar({ isOpen, onClose, onSeeGallery, onGoToCart, onGoToOrders, onGoToNotifications, sessionId, photographer }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [photographerName, setPhotographerName] = useState(photographer?.display_name || '');
  const [notifCount, setNotifCount] = useState(0);

  useEffect(() => {
    async function fetchNotifCount() {
      if (!isOpen) return;
      try {
        // No realtime/SSE equivalent — count open artwork reviews via the
        // shopper notifications endpoint (same refresh as PrintStoreApp).
        const params = new URLSearchParams();
        if (sessionId) {
          params.set('sessionId', sessionId);
        } else {
          const { getUser } = await import('../../services/workersAuth.service');
          const user = await getUser().catch(() => null);
          if (user?.email) params.set('email', user.email);
        }
        if (!params.toString()) return;
        const data = await apiFetch(`/v1/printstore/reviews/notifications?${params.toString()}`, { auth: false }).catch(() => null);
        setNotifCount((data?.reviews || []).length);
      } catch (err) {}
    }
    fetchNotifCount();
  }, [isOpen, sessionId]);

  useEffect(() => {
    if (photographer?.display_name) {
      setPhotographerName(photographer.display_name);
    }
  }, [photographer]);

  useEffect(() => {
    async function fetchPhotographerName() {
      try {
        // Resolve the signed-in photographer's own branding here. The
        // storefront name otherwise comes in via the `photographer` prop.
        try {
          const { getUser } = await import('../../services/workersAuth.service');
          const user = await getUser().catch(() => null);
          if (user?.id) {
            const data = await apiFetch(`/v1/public/photographer/by-id/${encodeURIComponent(user.id)}`, { auth: false }).catch(() => null);
            if (data?.photographer?.display_name) {
              setPhotographerName(data.photographer.display_name);
            }
          }
        } catch (workersErr) {
          console.error('Error loading photographer name:', workersErr);
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
    alert("Delivery link copied to clipboard!");
  };

  const handleGoToLab = () => {
    onClose();
    navigate('/lab');
  };

  const handleGoToPhotographer = () => {
    onClose();
    navigate('/photographer');
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

  const handleGoToNotifications = () => {
    onClose();
    if (onGoToNotifications) onGoToNotifications();
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

        {/* Go photographer button */}
        <button className="menu-drawer-share-btn" onClick={handleGoToPhotographer} style={{ marginTop: '10px' }}>
          <Camera size={18} strokeWidth={1.5} />
          <span>Go photographer</span>
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
