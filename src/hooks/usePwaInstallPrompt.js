import { useEffect, useRef, useState } from 'react';
import { isAndroidChrome, isStandaloneDisplay } from '../lib/mobileGalleryInstall';

/**
 * Captures Chrome's beforeinstallprompt for one-tap Android PWA install.
 */
export function usePwaInstallPrompt(slug) {
  const deferredRef = useRef(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!slug || isStandaloneDisplay()) return undefined;

    const onBeforeInstall = (event) => {
      event.preventDefault();
      deferredRef.current = event;
      setCanInstall(true);
    };

    const onInstalled = () => {
      deferredRef.current = null;
      setCanInstall(false);
      setInstalling(false);
      if (slug) {
        sessionStorage.removeItem(`mg-pending-install:${slug}`);
        sessionStorage.setItem(`mg-install-dismissed:${slug}`, '1');
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [slug]);

  const triggerInstall = async () => {
    const prompt = deferredRef.current;
    if (!prompt) return false;

    setInstalling(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      deferredRef.current = null;
      setCanInstall(false);
      return outcome === 'accepted';
    } catch {
      return false;
    } finally {
      setInstalling(false);
    }
  };

  const showAndroidInstall = isAndroidChrome() && !isStandaloneDisplay();

  return {
    canInstall,
    installing,
    triggerInstall,
    showAndroidInstall,
    hasNativePrompt: Boolean(deferredRef.current) || canInstall,
  };
}
