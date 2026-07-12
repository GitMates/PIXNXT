import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { getPublicSiteOrigin } from '../lib/publicSiteUrl';

async function readFunctionErrorMessage(error) {
  let message = error?.message || 'Could not send delivery email';
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    } catch {
      /* use default */
    }
  }
  if (message.includes('non-2xx')) {
    return 'Email could not be sent. Check that SMTP is configured in Supabase Edge Function secrets.';
  }
  return message;
}

export const guestDeliveryPublishService = {
  async publishEvent(eventId) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('You must be signed in to publish. Please sign in and try again.');
    }

    const res = await fetch('/api/guest-delivery/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ eventId }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok) {
      throw new Error(payload.error || 'Publish failed. Please try again.');
    }
    return payload.result;
  },

  async sendDeliveryEmail({ eventId, guestId, sendCopy = false }) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('You must be signed in to send emails.');
    }

    const { data, error } = await supabase.functions.invoke('send-guest-delivery-email', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        eventId,
        guestId,
        sendCopy,
        siteOrigin: getPublicSiteOrigin(),
      },
    });

    if (error) {
      throw new Error(await readFunctionErrorMessage(error));
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  },

  async loadGuestGallery({ slug, accessToken }) {
    const res = await fetch('/api/guest-delivery/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, accessToken }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok) {
      throw new Error(payload.error || 'Could not load your gallery.');
    }
    return payload.result;
  },
};
