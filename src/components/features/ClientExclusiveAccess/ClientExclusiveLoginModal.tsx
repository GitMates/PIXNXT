import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { verifyClientPassword } from '../../../lib/clientExclusiveAccess';
import './ClientExclusiveAccess.css';

export interface ClientExclusiveLoginModalProps {
  open: boolean;
  storedPassword: string | null | undefined;
  collectionId?: string | null;
  onSuccess: () => void;
  onClose?: () => void;
}

export const ClientExclusiveLoginModal: React.FC<ClientExclusiveLoginModalProps> = ({
  open,
  storedPassword,
  collectionId = null,
  onSuccess,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Workers verifies server-side (hashes never leave the API).
    if (collectionId) {
      setChecking(true);
      try {
        const { verifyGalleryAccess } = await import('../../../services/workersGallery.service');
        const { passwordOk } = await verifyGalleryAccess(collectionId, { password });
        if (passwordOk) {
          setError('');
          setPassword('');
          onSuccess();
        } else {
          setError('Incorrect client password. Please try again.');
        }
      } catch {
        setError('Could not verify password. Please try again.');
      } finally {
        setChecking(false);
      }
      return;
    }
    if (verifyClientPassword(password, storedPassword)) {
      console.log('Client Login Success!');
      setError('');
      setPassword('');
      onSuccess();
    } else {
      console.log('Client Login Failed!');
      setError('Incorrect client password. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="cea-login-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="cea-login-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Client access</h3>
            <p>Enter your client password to view client-only sets and manage private photos.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Client password"
                autoComplete="off"
                autoFocus
              />
              {error ? <p className="cea-login-error">{error}</p> : null}
              <button type="submit" className="cea-login-submit" disabled={checking}>
                {checking ? 'Checking…' : 'Continue'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
