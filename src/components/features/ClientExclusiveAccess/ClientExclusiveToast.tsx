import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './ClientExclusiveAccess.css';

export interface ClientExclusiveToastProps {
  message: string | null;
  thumbnailUrl?: string | null;
}

export const ClientExclusiveToast: React.FC<ClientExclusiveToastProps> = ({ message, thumbnailUrl }) => (
  <AnimatePresence>
    {message ? (
      <motion.div
        className="cea-toast"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.25 }}
        role="status"
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="cea-toast-thumb" />
        ) : (
          <div className="cea-toast-thumb" />
        )}
        <span className="cea-toast-message">{message}</span>
      </motion.div>
    ) : null}
  </AnimatePresence>
);
