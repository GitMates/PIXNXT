import React, { useMemo } from 'react';

function formatLiveSince(iso) {
  if (!iso) return 'just now';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'just now';
  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `since ${day} ${month}, ${time}`;
}

function sendGuestsLabel(count) {
  return `Send to ${Number(count || 0).toLocaleString()} guests`;
}

function StatusRow({ tone, title, detail }) {
  return (
    <li className="gd-pub-row">
      <span className={`gd-pub-icon gd-pub-icon--${tone}`} aria-hidden>
        {tone === 'ok' ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : tone === 'warn' ? (
          <span className="gd-pub-bang">!</span>
        ) : (
          <span className="gd-pub-icon-dot" />
        )}
      </span>
      <div className="gd-pub-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </li>
  );
}

export function GuestDeliveryPublishedPopup({
  collection,
  event,
  guests = [],
  sending = false,
  onSend,
  onUnpublish,
  unpublishing = false,
}) {
  const guestCount = guests.length || Number(event?.guest_count) || 0;
  const selfieCount = guests.filter((guest) => Boolean(guest.selfie_url)).length;
  const sentCount = guests.filter(
    (guest) => guest.delivery_status === 'sent' || Boolean(guest.delivery_email_sent_at)
  ).length;
  const deliverySent = sentCount > 0;

  const reviewGuests = useMemo(() => (
    guests.filter((guest) => {
      const status = guest.delivery_status;
      if (status === 'no_match' || status === 'failed') return true;
      if (
        event?.status === 'published'
        && guest.selfie_url
        && !(Number(guest.matched_photo_count) > 0)
        && status !== 'sent'
      ) {
        return true;
      }
      return false;
    })
  ), [guests, event?.status]);

  const reviewCount = reviewGuests.length;
  const reviewGuest = reviewGuests[0];
  const liveAt = collection?.published_at || event?.published_at || collection?.updated_at;

  return (
    <div className="gd-pub-popup" role="dialog" aria-labelledby="gd-pub-title" onClick={(e) => e.stopPropagation()}>
      <header className="gd-pub-head">
        <h2 id="gd-pub-title" className="gd-pub-title">Published</h2>
        <p className="gd-pub-lead">
          Your client can open the gallery and the QR is taking registrations. Guests have not received their own photos yet.
        </p>
      </header>

      <ul className="gd-pub-list">
        <StatusRow
          tone="ok"
          title="Link is live"
          detail={formatLiveSince(liveAt)}
        />
        <StatusRow
          tone="ok"
          title={`${guestCount.toLocaleString()} guests registered`}
          detail={`${selfieCount.toLocaleString()} with a selfie`}
        />
        {reviewCount > 0 ? (
          <StatusRow
            tone="warn"
            title={`${reviewCount} match${reviewCount === 1 ? '' : 'es'} need${reviewCount === 1 ? 's' : ''} review`}
            detail={`${reviewGuest?.name || 'Guest'} · ${reviewGuest?.delivery_status === 'failed' ? 'matching failed' : 'low confidence'}`}
          />
        ) : null}
        <StatusRow
          tone={deliverySent ? 'ok' : 'pending'}
          title={deliverySent ? 'Guest delivery sent' : 'Guest delivery not sent'}
          detail={
            deliverySent
              ? `${sentCount.toLocaleString()} guest${sentCount === 1 ? '' : 's'} emailed`
              : 'sending closes QR registration'
          }
        />
      </ul>

      <footer className="gd-pub-actions">
        <button
          type="button"
          className="gd-pub-send"
          disabled={sending || guestCount < 1}
          onClick={onSend}
        >
          {sending ? 'Sending…' : sendGuestsLabel(guestCount)}
        </button>
        <button
          type="button"
          className="gd-pub-unpublish"
          disabled={unpublishing || sending}
          onClick={onUnpublish}
        >
          {unpublishing ? 'Hiding…' : 'Unpublish'}
        </button>
      </footer>
    </div>
  );
}
