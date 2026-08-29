import { useCallback, useEffect, useRef, useState } from 'react';
import { photoAiService } from '../services/photoAi.service';
import { prepareSelfieForRekognition } from '../lib/selfieImageForRekognition';
import { subscribePersonLabelUpdates } from '../lib/galleryLiveSync';

export function useGalleryPeople(collectionId, { enabled = true, isPublic = true } = {}) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activePersonId, setActivePersonId] = useState(null);
  const [selfieMatchPhotoIds, setSelfieMatchPhotoIds] = useState([]);
  const [selfieSearching, setSelfieSearching] = useState(false);
  const [selfieMessage, setSelfieMessage] = useState('');
  const loadedRef = useRef(false);

  const loadPeople = useCallback(async () => {
    if (!collectionId || !enabled) return;
    setLoading(true);
    try {
      const { people: rows } = await photoAiService.getPeopleFromDb(collectionId);
      setPeople(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.warn('[useGalleryPeople] load failed:', err?.message || err);
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, [collectionId, enabled]);

  useEffect(() => {
    if (!collectionId || !enabled) {
      setPeople([]);
      loadedRef.current = false;
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;
    void loadPeople();
  }, [collectionId, enabled, loadPeople]);

  useEffect(() => {
    if (!collectionId) return undefined;
    return subscribePersonLabelUpdates(({ collectionId: cid, personId, label }) => {
      if (cid !== collectionId || !personId || !label) return;
      setPeople((prev) =>
        prev.map((person) => (person.id === personId ? { ...person, label } : person))
      );
    });
  }, [collectionId]);

  const activePerson = people.find((p) => p.id === activePersonId) || null;

  const selectPerson = useCallback((personId) => {
    setSelfieMatchPhotoIds([]);
    setSelfieMessage('');
    setActivePersonId((current) => (current === personId ? null : personId));
  }, []);

  const clearFilter = useCallback(() => {
    setActivePersonId(null);
    setSelfieMatchPhotoIds([]);
    setSelfieMessage('');
  }, []);

  const searchBySelfie = useCallback(
    async (file) => {
      if (!collectionId || !file) return;
      if (!file.type.startsWith('image/')) {
        setSelfieMessage('Please upload a photo with your face clearly visible.');
        return;
      }
      if (file.size > 40 * 1024 * 1024) {
        setSelfieMessage('Selfie must be 40 MB or smaller.');
        return;
      }

      setSelfieSearching(true);
      setSelfieMessage('');
      setActivePersonId(null);
      try {
        const jpegDataUrl = await prepareSelfieForRekognition(file);
        const searchFn = isPublic
          ? photoAiService.searchBySelfiePublic
          : photoAiService.searchBySelfie;
        const result = await searchFn(collectionId, jpegDataUrl);
        if (result?.matched && result.photoIds?.length) {
          setSelfieMatchPhotoIds(result.photoIds);
          setSelfieMessage(result.message || `Found ${result.photoIds.length} photos.`);
        } else {
          setSelfieMatchPhotoIds([]);
          setSelfieMessage(result?.message || 'No matching faces found in this gallery.');
        }
      } catch (err) {
        setSelfieMatchPhotoIds([]);
        setSelfieMessage(err?.message || 'Could not search with this selfie.');
      } finally {
        setSelfieSearching(false);
      }
    },
    [collectionId, isPublic]
  );

  const renamePerson = useCallback(
    async (personId, label) => {
      if (!collectionId || !personId) return;
      const trimmed = String(label || '').trim();
      if (!trimmed) return;
      setPeople((prev) =>
        prev.map((person) => (person.id === personId ? { ...person, label: trimmed } : person))
      );
      await photoAiService.setPersonLabel(collectionId, personId, trimmed);
    },
    [collectionId]
  );

  const isFilterActive = Boolean(activePersonId || selfieMatchPhotoIds.length);

  return {
    people,
    loading,
    activePersonId,
    activePerson,
    selfieMatchPhotoIds,
    selfieSearching,
    selfieMessage,
    isFilterActive,
    selectPerson,
    clearFilter,
    searchBySelfie,
    renamePerson,
    reloadPeople: loadPeople,
  };
}
