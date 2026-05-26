import React from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';

/**
 * Irreversible confirmation before submitting favorites to the photographer.
 */
export function FavoriteSubmitModal({
  open,
  listName,
  photoCount,
  isSubmitting,
  clientMessage,
  onClientMessageChange,
  onCancel,
  onConfirm,
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={() => !isSubmitting && onCancel()}
          />
          <Motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="relative z-[1] w-full max-w-md border px-8 py-8 shadow-2xl"
            style={{
              borderColor: 'var(--gallery-border)',
              backgroundColor: 'var(--gallery-secondary-bg)',
              color: 'var(--gallery-text)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em]">
              Submit favorites
            </h2>
            <p className="mb-2 text-center text-sm leading-relaxed" style={{ color: 'var(--gallery-meta-text)' }}>
              Once your favourite photos are submitted, this can&apos;t be undone.
            </p>
            <p className="mb-4 text-center text-sm opacity-80">
              {listName ? (
                <>
                  <span className="font-semibold">{listName}</span>
                  {' · '}
                </>
              ) : null}
              {photoCount} {photoCount === 1 ? 'photo' : 'photos'} will be sent to your photographer.
            </p>
            <label className="mb-6 block text-left">
              <span
                className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em] opacity-60"
                style={{ color: 'var(--gallery-meta-text)' }}
              >
                Message to photographer (optional)
              </span>
              <textarea
                value={clientMessage}
                onChange={(e) => onClientMessageChange?.(e.target.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder="Add a note for your photographer…"
                className="w-full resize-none border px-3 py-2 text-sm outline-none disabled:opacity-50"
                style={{
                  borderColor: 'var(--gallery-border)',
                  backgroundColor: 'var(--gallery-bg)',
                  color: 'var(--gallery-text)',
                }}
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={onCancel}
                className="px-2 py-2 text-sm font-medium opacity-70 hover:opacity-100 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || photoCount < 1}
                onClick={onConfirm}
                className="rounded px-6 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={{ backgroundColor: 'var(--gallery-accent)', color: 'var(--gallery-bg)' }}
              >
                {isSubmitting ? 'Submitting…' : 'Confirm'}
              </button>
            </div>
          </Motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
