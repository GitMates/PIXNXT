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
  const loadedForRef = useRef(null);

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
      setActivePersonId(null);
      setSelfieMatchPhotoIds([]);
      setSelfieMessage('');
      loadedForRef.current = null;
      return;
    }
    if (loadedForRef.current === collectionId) return;
    loadedForRef.current = collectionId;
    setActivePersonId(null);
    setSelfieMatchPhotoIds([]);
    setSelfieMessage('');
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
      // Guest fallback entries (guest-<id>) have no photo_ai_people row —
      // keep the rename local instead of failing against the API.
      if (String(personId).startsWith('guest-')) return;
      await photoAiService.setPersonLabel(collectionId, personId, trimmed);
    },
    [collectionId]
  );

  const deletePerson = useCallback(
    async (personId) => {
      if (!collectionId || !personId) return;
      // Optimistically remove from local state
      setPeople((prev) => prev.filter((person) => person.id !== personId));
      // Clear filter if this person was active
      if (activePersonId === personId) {
        setActivePersonId(null);
        setSelfieMatchPhotoIds([]);
        setSelfieMessage('');
      }
      if (String(personId).startsWith('guest-')) return;
      try {
        await photoAiService.deletePerson(collectionId, personId);
      } catch (err) {
        console.error('[useGalleryPeople] deletePerson failed:', err?.message || err);
        // Reload to restore correct state on failure
        void loadPeople();
      }
    },
    [collectionId, activePersonId, loadPeople]
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
    deletePerson,
    reloadPeople: loadPeople,
  };
}
