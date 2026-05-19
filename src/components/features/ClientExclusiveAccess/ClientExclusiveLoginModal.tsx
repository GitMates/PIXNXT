import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { verifyClientPassword } from '../../../lib/clientExclusiveAccess';
import './ClientExclusiveAccess.css';

export interface ClientExclusiveLoginModalProps {
  open: boolean;
  storedPassword: string | null | undefined;
  onSuccess: () => void;
  onClose?: () => void;
}

export const ClientExclusiveLoginModal: React.FC<ClientExclusiveLoginModalProps> = ({
  open,
  storedPassword,
  onSuccess,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Client Login Attempt:', { entered: password, stored: storedPassword });
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
              <button type="submit" className="cea-login-submit">
                Continue
              </button>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
