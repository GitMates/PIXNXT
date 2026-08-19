import React, { useState } from 'react';
import { galleryService } from '../../../services/gallery.service';

export function ShowcaseEnquiryForm({ photographerId, photographerName }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photographerId || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await galleryService.submitShowcaseEnquiry({
        photographerId,
        name,
        email,
        message,
      });
      setSent(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      console.error('Enquiry submit failed:', err);
      setError('Could not send your message. Please try again or email the studio directly.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <section style={{ padding: '0 40px 64px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{
          textAlign: 'center',
          padding: '40px 24px',
          border: '1px solid #e8e8e8',
          fontFamily: 'sans-serif',
        }}>
          <p style={{ margin: 0, fontSize: 15, color: '#222', letterSpacing: '0.02em' }}>
            Thank you — your message was sent to {photographerName || 'the studio'}.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: '0 40px 64px', maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{
        margin: '0 0 8px',
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: 28,
        fontWeight: 400,
        letterSpacing: '0.04em',
        textAlign: 'center',
        color: '#111',
      }}>
        Get in touch
      </h2>
      <p style={{
        margin: '0 0 28px',
        textAlign: 'center',
        fontFamily: 'sans-serif',
        fontSize: 13,
        color: '#888',
        lineHeight: 1.5,
      }}>
        Send a message about your event or session.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          style={inputStyle}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          required
          style={inputStyle}
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us about your event…"
          required
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
        />
        {error && (
          <p style={{ margin: 0, fontFamily: 'sans-serif', fontSize: 12, color: '#c0392b' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: 8,
            padding: '14px 24px',
            background: submitting ? '#555' : '#111',
            color: '#fff',
            border: 'none',
            fontFamily: 'sans-serif',
            fontSize: 12,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: submitting ? 'wait' : 'pointer',
          }}
        >
          {submitting ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </section>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #ddd',
  borderRadius: 0,
  fontFamily: 'sans-serif',
  fontSize: 14,
  color: '#111',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
};
