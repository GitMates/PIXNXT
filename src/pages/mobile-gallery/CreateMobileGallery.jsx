import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CreateMobileGallery = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect directly to the dashboard, which now has the overlay dialog built-in
    navigate('/mobile-gallery');
  }, [navigate]);

  return (
    <div style={{ padding: 40, color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
      Redirecting to Mobile Gallery App Studio...
    </div>
  );
};

export default CreateMobileGallery;
