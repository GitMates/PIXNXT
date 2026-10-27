import { studioChipLabel, studioVideoChip } from '../../../../lib/videoDelivery';
import './VideoDelivery.css';

export function VideoDeliveryChip({ photo, onOpen }) {
  const kind = studioVideoChip(photo);
  if (!kind) return null;
  return (
    <button
      type="button"
      className={`vd-chip vd-chip--${kind}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(photo);
      }}
    >
      {kind === 'preparing' ? <span className="vd-chip__dot" aria-hidden /> : null}
      {studioChipLabel(kind)}
    </button>
  );
}
