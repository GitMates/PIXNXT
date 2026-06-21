import React, { useCallback, useEffect, useRef, useState } from 'react';

function FocalPointModal({ open, coverUrl, focalX, focalY, onChange, onClose }) {
  const imageRef = useRef(null);
  const draggingRef = useRef(false);
  const [local, setLocal] = useState({ x: focalX, y: focalY });

  useEffect(() => {
    if (open) setLocal({ x: focalX, y: focalY });
  }, [open, focalX, focalY]);

  const updateFromPointer = useCallback(
    (clientX, clientY) => {
      const el = imageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
      const next = { x: Math.round(x), y: Math.round(y) };
      setLocal(next);
      onChange(next);
    },
    [onChange]
  );

  const handlePointerDown = (e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !coverUrl) return null;

  return (
    <div className="mg-focal-overlay" role="presentation" onClick={onClose}>
      <div
        className="mg-focal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mg-focal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mg-focal-header">
          <h2 id="mg-focal-title" className="mg-focal-title">
            Focal Point
          </h2>
          <button type="button" className="mg-focal-done" onClick={onClose}>
            Done
          </button>
        </header>

        <div
          ref={imageRef}
          className="mg-focal-image-wrap"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img src={coverUrl} alt="" className="mg-focal-image" draggable={false} />
          <div
            className="mg-focal-marker"
            style={{ left: `${local.x}%`, top: `${local.y}%` }}
            aria-hidden
          >
            <span className="mg-focal-marker-ring mg-focal-marker-ring--outer" />
            <span className="mg-focal-marker-ring mg-focal-marker-ring--inner" />
            <span className="mg-focal-marker-dot" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FocalPointModal;
