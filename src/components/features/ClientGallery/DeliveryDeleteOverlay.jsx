import './DeliveryDeleteOverlay.css';

export function DeliveryDeleteOverlay({ compact = false }) {
  return (
    <div
      className={`dl-delete-overlay-card${compact ? ' dl-delete-overlay-card--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Deleting delivery"
    >
      <div className="dl-delete-overlay-card__veil" aria-hidden />
      <div className="dl-delete-overlay-card__shimmer" aria-hidden />
      <div className="dl-delete-overlay-card__content">
        <span className="dl-delete-overlay-card__spinner" aria-hidden />
        <span>Deleting…</span>
      </div>
    </div>
  );
}
