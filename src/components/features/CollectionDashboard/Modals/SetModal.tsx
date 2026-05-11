import React from 'react';
import { PhotoSet } from '../../../../types/collection.types';

interface SetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  isSaving: boolean;
  isHighlights?: boolean;
}

export const SetModal: React.FC<SetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  name,
  setName,
  description,
  setDescription,
  isSaving,
  isHighlights = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal small" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal-header">
          <h3 className="cd-modal-title">{title}</h3>
          <button className="cd-modal-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="cd-modal-body">
          {isHighlights ? (
            <div className="cd-form-group">
              <label className="cd-form-label">Set Name</label>
              <div style={{ padding: '10px 14px', background: '#f5f5f5', borderRadius: '4px', fontSize: '14px', color: '#555', border: '1px solid #e0e0e0' }}>
                Highlights <span style={{ fontSize: '12px', color: '#999', marginLeft: '8px' }}>(fixed — cannot be renamed)</span>
              </div>
            </div>
          ) : (
            <div className="cd-form-group">
              <label className="cd-form-label">Photo Set Name</label>
              <input 
                type="text" 
                className="cd-form-input" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ceremony, Portrait"
                autoFocus
              />
            </div>
          )}
          <div className="cd-form-group">
            <label className="cd-form-label">Description</label>
            <textarea 
              className="cd-form-input textarea" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isHighlights ? 'Add a description for the Highlights set (shown to clients)' : 'Add a description for this set'}
            />
          </div>
        </div>

        <div className="cd-modal-footer-actions">
          <button className="cd-modal-btn secondary" onClick={onClose}>{isHighlights ? 'Close' : 'Cancel'}</button>
          {!isHighlights && (
            <button 
              className="cd-modal-btn primary" 
              onClick={onSave}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
