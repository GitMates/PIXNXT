import { studioVideoChip } from '../../../../lib/videoDelivery';
import './VideoDelivery.css';

export function downloadPreviewCount(photos) {
  return (photos || []).filter((photo) => studioVideoChip(photo) === 'download').length;
}

export function VideoDeliveryNotice({ photos, onReview, onHide }) {
  const count = downloadPreviewCount(photos);
  if (count <= 0) return null;
  return (
    <div className="vd-notice">
      <p>
        {count} {count === 1 ? 'film is' : 'films are'} shared as download with a preview.
        Clients can still watch the preview.
      </p>
      <div className="vd-notice__actions">
        <button type="button" onClick={onReview}>Review</button>
        <button type="button" className="vd-notice__ghost" onClick={onHide}>Hide</button>
      </div>
    </div>
  );
}
