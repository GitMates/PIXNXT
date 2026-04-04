import { useState } from 'react';
import { galleryService } from '../services/gallery.service';
import { Photo } from '../types/collection.types';

interface UsePhotoOperationsProps {
  collectionId: string | null | undefined;
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
}

export function usePhotoOperations({ collectionId, setPhotos }: UsePhotoOperationsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const clearSelection = () => {
    setSelectedPhotos([]);
  };

  const handleToggleStar = async (photoId: string, currentStarred: boolean) => {
    try {
      const updatedPhoto = await galleryService.togglePhotoStar(photoId, !currentStarred);
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, is_starred: updatedPhoto.is_starred } : p));
    } catch (err) {
      console.error('Star toggle failed:', err);
      throw err;
    }
  };

  const deleteSelectedPhotos = async (idsToDelete?: string[]) => {
    const targets = idsToDelete || selectedPhotos;
    if (targets.length === 0 || !collectionId) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${targets.length} photo(s)?`);
    if (!confirmed) return;

    try {
      setIsProcessing(true);
      await galleryService.deletePhotos(targets);
      
      setPhotos(prev => prev.filter(p => !targets.includes(p.id)));
      if (!idsToDelete) setSelectedPhotos([]);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete photos. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMovePhotosToSet = async (setId: string | null) => {
    if (selectedPhotos.length === 0) return;
    try {
      setIsProcessing(true);
      await galleryService.assignPhotosToSet(selectedPhotos, setId);
      
      setPhotos(prev => prev.map(p => 
        selectedPhotos.includes(p.id) ? { ...p, set_id: setId } : p
      ));
      
      clearSelection();
    } catch (err) {
      console.error('Move failed:', err);
      alert('Failed to move photos. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    selectedPhotos,
    setSelectedPhotos,
    togglePhotoSelection,
    clearSelection,
    handleToggleStar,
    deleteSelectedPhotos,
    handleMovePhotosToSet
  };
}
