function apiBase() {
  return String(process.env.VITE_API_URL || '').replace(/\/+$/, '');
}

export async function handleGuestGalleryRequest(body) {
  const slug = String(body?.slug || '').trim();
  const accessToken = String(body?.accessToken || body?.token || '').trim();

  if (!slug || !accessToken) {
    throw new Error('Event and access token are required.');
  }

  const base = apiBase();
  if (!base) throw new Error('VITE_API_URL is not configured');

  const res = await fetch(`${base}/v1/guest/gallery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, accessToken }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error?.message || 'Event not found for this link.');
  }

  const event = payload?.event || {};
  const guest = payload?.guest || null;
  const photos = Array.isArray(payload?.photos) ? payload.photos : [];

  const sortedPhotos = [...photos]
    .map((photo) => ({
      ...photo,
      similarity: photo?.similarity ?? null,
    }))
    .sort((a, b) => {
      const pos = (a.position ?? 0) - (b.position ?? 0);
      if (pos !== 0) return pos;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });

  if (!guest) {
    throw new Error('Invalid or expired guest link. Use Copy link from Guests, or resend the email.');
  }

  return {
    event: {
      name: event.name,
      slug: event.slug,
      eventDate: event.event_date,
      coverImageUrl: event.cover_image_url,
    },
    guest: {
      name: guest.name,
      matchedPhotoCount: sortedPhotos.length,
    },
    photos: sortedPhotos,
  };
}
