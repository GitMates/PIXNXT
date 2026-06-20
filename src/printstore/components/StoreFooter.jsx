import React from 'react';
import { Mail } from 'lucide-react';

export default function StoreFooter({ photographer }) {
  const photographerName = photographer?.display_name || '';
  const email = photographer?.email || '';

  return (
    <footer className="store-footer">
      {/* Photographer Name */}
      <div className="footer-branding">
        {photographerName}
      </div>

      {/* Social / Contact email icon */}
      <button
        className="footer-social-btn"
        onClick={() => window.open(`mailto:${email}`)}
        aria-label="Send Email to Photographer"
      >
        <Mail size={16} />
      </button>

      {/* Links Row */}
      <div className="footer-links-row">
        <span>Powered by Pic-Time</span>
        <a href="#terms" className="footer-link" onClick={(e) => { e.preventDefault(); alert("Terms of Service (Mock Link)"); }}>
          Terms of Service
        </a>
        <a href="#privacy" className="footer-link" onClick={(e) => { e.preventDefault(); alert("Privacy Policy (Mock Link)"); }}>
          Privacy Policy
        </a>
      </div>
    </footer>
  );
}
