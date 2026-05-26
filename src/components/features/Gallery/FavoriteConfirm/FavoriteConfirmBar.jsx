import React from 'react';
import { cn } from '../../../../lib/utils';
import { FavoriteConfirmButton } from './FavoriteConfirmButton';

/**
 * Sticky bar: confirm favorite selection before submitting to the photographer.
 */
export function FavoriteConfirmBar({
  listName,
  selectedCount,
  maxSelection,
  isSubmitting,
  onConfirmClick,
  className,
}) {
  const cap =
    maxSelection != null && Number(maxSelection) > 0 ? Number(maxSelection) : null;
  const countLabel =
    cap != null ? `${selectedCount} of ${cap} selected` : `${selectedCount} selected`;
  const canSubmit = selectedCount > 0 && !isSubmitting;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[90] border-t px-4 py-4 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]',
        className
      )}
      style={{
        borderColor: 'var(--gallery-border)',
        backgroundColor: 'var(--gallery-secondary-bg)',
        color: 'var(--gallery-text)',
      }}
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="text-[12px] font-bold uppercase tracking-[0.25em] opacity-60">
            {listName || 'Favorites'}
          </p>
          <p className="text-sm font-medium">{countLabel}</p>
        </div>
        <FavoriteConfirmButton
          disabled={!canSubmit}
          isSubmitting={isSubmitting}
          onClick={onConfirmClick}
          className="min-w-[220px] sm:w-auto"
        />
      </div>
    </div>
  );
}
