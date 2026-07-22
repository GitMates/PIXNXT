import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import { photoAiService } from '../services/photoAi.service';
import { collectLabelSuggestions, filterPhotosByAiSearch, filterPhotosByDateRange } from '../lib/photoAiSearch';
import { formatFilterDateRangeLabel } from '../utils/clientGalleryFilters';
import { groupPhotosByMonth } from '../lib/groupPhotosByMonth';
import { LibrarySearchBar } from '../components/features/PhotoLibrary/LibrarySearchBar';
import { CollectionGridPhoto } from '../components/features/CollectionDashboard/Media/CollectionGridPhoto';
import './PhotoLibrary.css';
import './CollectionDashboard.css';

const PhotoLibrary = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [photos, setPhotos] = useState([]);
  const [collectionCount, setCollectionCount] = useState(0);
  const [metadataRows, setMetadataRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showDatePanel, setShowDatePanel] = useState(false);

  const loadLibrary = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [photoRows, metadataResult, collections] = await Promise.all([
        galleryService.getLibraryPhotos(user.id),
        photoAiService.getAllMetadataForPhotographer(user.id),
        galleryService.getCollections(user.id),
      ]);
      setPhotos(photoRows);
      setCollectionCount(collections?.length || 0);
      setMetadataRows(metadataResult.rows || []);
    } catch (err) {
      console.error('Failed to load photo library:', err);
      setError('Failed to load photo library. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const metadataMap = useMemo(
    () => photoAiService.metadataToMap(metadataRows),
    [metadataRows]
  );

  const labelSuggestions = useMemo(
    () => collectLabelSuggestions(metadataRows, 16),
    [metadataRows]
  );

  const filteredPhotos = useMemo(() => {
    let result = photos;
    if (starredOnly) {
      result = result.filter((photo) => photo.is_starred);
    }
    result = filterPhotosByDateRange(result, dateRange);
    return filterPhotosByAiSearch(result, metadataMap, searchQuery);
  }, [photos, metadataMap, searchQuery, starredOnly, dateRange]);

  const monthGroups = useMemo(
    () => groupPhotosByMonth(filteredPhotos),
    [filteredPhotos]
  );

  const monthGroupsWithOffset = useMemo(() => {
    let offset = 0;
    return monthGroups.map((group) => {
      const startIndex = offset;
      offset += group.photos.length;
      return { ...group, startIndex };
    });
  }, [monthGroups]);

  const isFilterActive = Boolean(searchQuery.trim() || starredOnly || dateRange?.start);
  const hasPhotos = photos.length > 0;

  const openPhotoCollection = (photo) => {
    const collectionId = photo.collection_id || photo.collection?.id;
    if (!collectionId) return;
    navigate(`/collections/manage?id=${encodeURIComponent(collectionId)}`);
  };

  return (
    <SidebarLayout>
      <main className="pl-main">
        <header className="pl-header">
          <div className="pl-header-copy">
            <h1 className="pl-title">Photo Library</h1>
            {!loading && hasPhotos ? (
              <p className="pl-subtitle">
                {photos.length} photo{photos.length === 1 ? '' : 's'} from {collectionCount} collection{collectionCount === 1 ? '' : 's'}
              </p>
            ) : null}
          </div>
          <div className="pl-header-actions">
            <LibrarySearchBar
              query={searchQuery}
              onQueryChange={setSearchQuery}
              labelSuggestions={labelSuggestions}
              starredOnly={starredOnly}
              onStarredOnlyChange={setStarredOnly}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              showPanel={showSearchPanel}
              onShowPanelChange={setShowSearchPanel}
              showDatePanel={showDatePanel}
              onShowDatePanelChange={setShowDatePanel}
            />
          </div>
        </header>

        {loading ? (
          <div className="pl-loading">Loading…</div>
        ) : error ? (
          <div className="pl-loading pl-loading--error">{error}</div>
        ) : !hasPhotos ? (
          <div className="pl-empty-state">
            <div className="pl-empty-graphic">
              <svg width="160" height="140" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M120 160H20C8.9543 160 0 151.046 0 140V40C0 28.9543 8.9543 20 20 20H60L80 40H120C131.046 40 140 48.9543 140 60V140C140 151.046 131.046 160 120 160Z" fill="#eafaf6" />
                <path d="M110 50H40C28.9543 50 20 58.9543 20 70V130C20 141.046 28.9543 150 40 150H110C121.046 150 130 141.046 130 130V70C130 58.9543 121.046 50 110 50Z" fill="#ffffff" stroke="#333" strokeWidth="4" />
                <path d="M40 110L60 90L80 110M70 100L90 80L110 100" stroke="#333" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="55" cy="75" r="8" fill="#333" />
                <path d="M160 160V120C160 108.954 151.046 100 140 100H100" stroke="#333" strokeWidth="4" strokeLinecap="round" />
                <circle cx="130" cy="70" r="15" fill="#f4f4f4" stroke="#333" strokeWidth="4" />
              </svg>
            </div>
            <h2 className="pl-empty-title">You have no photos yet</h2>
            <p className="pl-empty-text">
              Every photo you upload to a client gallery collection
              <br />
              will appear here automatically.
            </p>
            <button type="button" className="pl-new-btn" onClick={() => navigate('/collections/get-started')}>
              New Collection
            </button>
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="pl-empty-state pl-empty-state--compact">
            <h2 className="pl-empty-title">No photos match your search</h2>
            <p className="pl-empty-text">
              Try a different keyword or clear your filters.
            </p>
            <button
              type="button"
              className="pl-new-btn"
              onClick={() => {
                setSearchQuery('');
                setStarredOnly(false);
                setDateRange(null);
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="pl-content">
            {isFilterActive && (
              <p className="pl-results-summary">
                Showing {filteredPhotos.length} of {photos.length} photos
                {dateRange?.start ? ` · ${formatFilterDateRangeLabel(dateRange)}` : ''}
              </p>
            )}
            {monthGroupsWithOffset.map((group) => (
              <section key={group.label} className="pl-month-section">
                <h2 className="pl-month-label">{group.label}</h2>
                <div className="cd-photo-grid cd-photo-grid--manage pl-library-grid">
                  {group.photos.map((photo, localIndex) => (
                      <div
                        key={photo.id}
                        className="cd-photo-card pl-library-photo-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => openPhotoCollection(photo)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openPhotoCollection(photo);
                          }
                        }}
                      >
                        <div className="cd-photo-card-inner cd-photo-card-inner--contain">
                          <div className="cd-photo-thumb-shell">
                            <CollectionGridPhoto
                              photo={photo}
                              index={group.startIndex + localIndex}
                              containInCell
                            />
                          </div>
                          {photo.is_starred ? (
                            <span className="cd-photo-star active" aria-label="Starred">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#FFC107" stroke="#FFC107" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            </span>
                          ) : null}
                        </div>
                      </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </SidebarLayout>
  );
};

export default PhotoLibrary;
