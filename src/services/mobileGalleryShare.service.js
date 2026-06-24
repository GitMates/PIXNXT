import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase/client';
import { getPublicSiteOrigin } from '../lib/publicSiteUrl';
import { isLocalOrigin, resolveInstallOrigin } from '../lib/mobileGalleryInstall';

async function readFunctionErrorMessage(error) {
  let message = error?.message || 'Could not send invite email';
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

export const mobileGalleryShareService = {
  async sendInvite({
    appId,
    recipientEmail,
    subject,
    message,
    sendCopy = false,
    websiteLink = null,
  }) {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error('You must be signed in to send invites. Please sign in and try again.');
    }

    const siteOrigin = resolveInstallOrigin('');
    if (!siteOrigin || isLocalOrigin(siteOrigin)) {
      throw new Error(
        'Install links must use your public domain. Open this page on https://www.pixnxt.in or set VITE_PUBLIC_SITE_URL and redeploy.'
      );
    }
    if (/vercel\.app/i.test(siteOrigin) && import.meta.env.PROD) {
      throw new Error(
        'Install links cannot use a Vercel preview URL. Open Mobile Gallery Share on https://www.pixnxt.in, or set VITE_PUBLIC_SITE_URL to https://www.pixnxt.in in Vercel and redeploy.'
      );
    }

    const { data, error } = await supabase.functions.invoke('send-mobile-gallery-invite', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        appId,
        recipientEmail: recipientEmail.trim(),
        subject: subject.trim(),
        message: message.trim(),
        sendCopy,
        siteOrigin,
        websiteHref: websiteLink?.href || null,
        websiteLabel: websiteLink?.label || null,
      },
    });

    if (error) {
      const msg = await readFunctionErrorMessage(error);
      const err = new Error(msg);
      err.code = msg.includes('not configured') ? 'SMTP_NOT_CONFIGURED' : 'SEND_FAILED';
      throw err;
    }
    if (data?.error) {
      const err = new Error(data.error);
      err.code = data.error.includes('not configured') ? 'SMTP_NOT_CONFIGURED' : 'SEND_FAILED';
      throw err;
    }

    return data;
  },

  async getInviteHistory(photographerId, appId) {
    const { data, error } = await supabase
      .from('mobile_gallery_invites')
      .select('id, recipient_email, subject, status, created_at')
      .eq('photographer_id', photographerId)
      .eq('app_id', appId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  },
};
