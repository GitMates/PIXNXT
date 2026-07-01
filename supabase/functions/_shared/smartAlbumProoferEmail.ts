export type ProoferSettings = {
  photographerAlerts?: 'instant' | 'digest';
  enableClientNudges?: boolean;
  nudgeDays?: number;
  statusChangeEmails?: boolean;
  clientReminderTemplate?: string;
  revisionRequestedTemplate?: string;
  approvedTemplate?: string;
};

export const DEFAULT_PROOFER_SETTINGS: ProoferSettings = {
  photographerAlerts: 'digest',
  enableClientNudges: true,
  nudgeDays: 5,
  statusChangeEmails: true,
  clientReminderTemplate:
    'Hi {{client_name}},\n\nJust a friendly reminder that your album {{album_name}} is awaiting your feedback.\n\nAccess your album here: {{album_link}}\n\nWe\'re excited to hear your thoughts!\n\nBest regards,\nYour Photography Team',
  revisionRequestedTemplate:
    'Hi {{client_name}},\n\nThank you for your feedback on {{album_name}}! Based on your input, we\'ve prepared some revisions for your review.\n\nView the updated album: {{view_album_link}}\n\nPlease let us know if these changes work better for you.\n\nBest regards',
  approvedTemplate:
    'Hi {{client_name}},\n\nWonderful news! Your album {{album_name}} has been approved and is ready for final delivery.\n\nThank you for your collaboration throughout this process!\n\nBest regards',
};

export function mergeProoferSettings(raw: unknown): ProoferSettings {
  const patch =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return { ...DEFAULT_PROOFER_SETTINGS, ...patch };
}

export async function loadPhotographerProoferSettings(
  supabaseAdmin: { from: (table: string) => any },
  photographerId: string
): Promise<ProoferSettings> {
  const { data } = await supabaseAdmin
    .from('smart_album_proofer_settings')
    .select('settings')
    .eq('photographer_id', photographerId)
    .maybeSingle();

  return mergeProoferSettings(data?.settings);
}

export function albumRemindersEnabled(
  prooferSettings: ProoferSettings,
  albumProoferSettings: Record<string, unknown> | null | undefined
): boolean {
  const albumSend = albumProoferSettings?.send_reminder_emails ?? albumProoferSettings?.sendReminderEmails;
  if (albumSend === true) return true;
  if (albumSend === false) return Boolean(prooferSettings.enableClientNudges);
  return Boolean(prooferSettings.enableClientNudges);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function applyTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>
): string {
  let out = template || '';
  Object.entries(vars).forEach(([key, value]) => {
    const safe = value == null ? '' : String(value);
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), safe);
  });
  return out;
}

export function templateToHtmlParagraphs(body: string): string {
  return body
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<p style="margin:0 0 16px;">&nbsp;</p>';
      return `<p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#555;">${escapeHtml(line)}</p>`;
    })
    .join('\n');
}

export function buildAlbumPreviewUrl(
  album: { id?: string; slug?: string | null },
  prooferSettings: Record<string, unknown> | null | undefined,
  siteOrigin: string
): string {
  const origin = siteOrigin.replace(/\/$/, '');
  const albumId = album.id || '';
  const accessLevel = String(
    prooferSettings?.access_level ?? prooferSettings?.accessLevel ?? 'password'
  );
  if (accessLevel === 'private') {
    const token = String(
      prooferSettings?.private_share_token ?? prooferSettings?.privateShareToken ?? albumId
    );
    return `${origin}/album-preview/${encodeURIComponent(albumId)}?token=${encodeURIComponent(token)}`;
  }
  const slug = album.slug || albumId;
  return `${origin}/album-preview/${encodeURIComponent(slug)}`;
}

export function buildClientTemplateEmailHtml(options: {
  photographerName: string;
  albumName: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const { photographerName, albumName, bodyHtml, ctaUrl, ctaLabel } = options;
  const ctaBlock = ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:8px;">
        <tr>
          <td style="border-radius:6px;background:#111;">
            <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#ffffff;text-decoration:none;">${escapeHtml(ctaLabel || 'View album')}</a>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f0f0f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:36px 40px 32px;text-align:left;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#999;">${escapeHtml(photographerName)}</p>
              <h1 style="margin:0 0 24px;font-size:20px;font-weight:700;letter-spacing:0.5px;color:#111;line-height:1.3;">${escapeHtml(albumName)}</h1>
              <div style="margin:0 0 24px;">${bodyHtml}</div>
              ${ctaBlock}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#aaa;text-align:center;">Sent by PIXNXT</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendSmtpEmail(options: {
  to: string;
  subject: string;
  plainBody: string;
  html: string;
}): Promise<void> {
  const { SmtpClient } = await import('https://deno.land/x/smtp@v0.7.0/mod.ts');
  const smtpConfig = {
    hostname: Deno.env.get('SMTP_HOST') || '',
    port: parseInt(Deno.env.get('SMTP_PORT') || '465', 10),
    username: Deno.env.get('SMTP_USER') || '',
    password: Deno.env.get('SMTP_PASS') || '',
  };

  if (!smtpConfig.hostname || !smtpConfig.username) {
    throw new Error('Email is not configured on the server');
  }

  const client = new SmtpClient();
  try {
    await client.connectTLS(smtpConfig);
    await client.send({
      from: smtpConfig.username,
      to: options.to,
      subject: options.subject,
      content: options.plainBody,
      html: options.html,
    });
  } finally {
    await client.close();
  }
}
