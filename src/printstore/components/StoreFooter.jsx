import React from 'react';
import { Mail } from 'lucide-react';

export default function StoreFooter() {
  return (
    <footer className="store-footer">
      {/* Photographer Name */}
      <div className="footer-branding">
        Kbaskaran
      </div>

      {/* Social / Contact email icon */}
      <button
        className="footer-social-btn"
        onClick={() => window.open('mailto:kbaskaran@example.com')}
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
