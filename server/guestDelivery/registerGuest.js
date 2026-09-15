function apiBase() {
  return String(process.env.VITE_API_URL || '').replace(/\/+$/, '');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function handleRegisterGuestRequest(body) {
  const slug = String(body?.slug || '').trim();
  const name = String(body?.name || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();
  const phone = body?.phone ? String(body.phone).trim() : null;

  if (!slug) throw new Error('Event not found.');
  if (!name) throw new Error('Name is required.');
  if (!email || !isValidEmail(email)) throw new Error('A valid email is required.');
  if (!body?.selfieBase64) throw new Error('Selfie image is required.');

  const base = apiBase();
  if (!base) throw new Error('VITE_API_URL is not configured');

  const res = await fetch(`${base}/v1/guest/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      name,
      email,
      phone,
      selfieBase64: body.selfieBase64,
    }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error?.message || 'Registration failed');
  }
  const guest = payload?.guest;
  if (!guest?.id) throw new Error('Registration failed');

  return {
    guestId: guest.id,
    name: guest.name,
    email: guest.email,
    registeredAt: guest.registered_at || guest.created_at || new Date().toISOString(),
  };
}
