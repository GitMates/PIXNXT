import React from 'react';
import { Heart, Plus } from 'lucide-react';

export default function CollectionsGrid({ favoritesCount, onSelectCollection }) {
  return (
    <section className="collections-section">
      <h2 className="collections-title">Collections</h2>
      <p className="collections-subtitle">
        This section is only visible to you and not shared with others.
      </p>

      <div className="collections-grid-wrapper">
        {/* Favorites Folder */}
        <div className="collection-card" onClick={() => onSelectCollection('favorites')}>
          <div className="collection-card-image-box">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400"
              alt="Favorites Folder Cover"
              className="collection-card-image"
            />
            <div className="collection-card-heart">
              <Heart size={20} fill="#ffffff" stroke="none" />
            </div>
          </div>
          <div className="collection-card-info">
            <h3 className="collection-card-name">Favorites</h3>
            <p className="collection-card-count">
              {favoritesCount} {favoritesCount === 1 ? 'photo' : 'photos'}
            </p>
          </div>
        </div>

        {/* Portraits Folder */}
        <div className="collection-card" onClick={() => onSelectCollection('portraits')}>
          <div className="collection-card-image-box">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
              alt="Portraits Folder Cover"
              className="collection-card-image"
            />
          </div>
          <div className="collection-card-info">
            <h3 className="collection-card-name">Portraits</h3>
            <p className="collection-card-count">6 photos</p>
          </div>
        </div>

        {/* Add Selection Card Placeholder */}
        <div className="collection-card">
          <div className="placeholder-collection-card">
            <Plus size={36} color="#bbbbbb" strokeWidth={1} />
          </div>
          <div className="collection-card-info" style={{ cursor: 'default' }}>
            <h3 className="collection-card-name" style={{ color: '#888888' }}>
              Create Selection
            </h3>
            <p className="collection-card-count">Custom photo list</p>
          </div>
        </div>
      </div>
    </section>
  );
}
