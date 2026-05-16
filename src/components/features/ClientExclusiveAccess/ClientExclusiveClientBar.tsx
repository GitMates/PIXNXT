import React from 'react';
import './ClientExclusiveAccess.css';

export interface ClientExclusiveClientBarProps {
  onSignOut: () => void;
}

export const ClientExclusiveClientBar: React.FC<ClientExclusiveClientBarProps> = ({ onSignOut }) => (
  <div className="cea-client-bar">
    <span>Client view — you can see private photos and client-only sets</span>
    <button type="button" onClick={onSignOut}>
      Sign out
    </button>
  </div>
);
