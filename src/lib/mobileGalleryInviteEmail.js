/**
 * Pixieset-style mobile gallery invite email markup.
 * Keep in sync with supabase/functions/send-mobile-gallery-invite/index.ts
 */

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textToHtmlParagraphs(text) {
  return escapeHtml(text)
    .split('\n')
    .map((line) =>
      line.trim()
        ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#555;text-align:center;">${line}</p>`
        : ''
    )
    .filter(Boolean)
    .join('');
}

export function buildInviteEmailHtml({
  appName,
  message,
  directLink,
  iconUrl,
  websiteHref = null,
  websiteLabel = null,
}) {
  const displayName = escapeHtml((appName || 'Gallery').toUpperCase());
  const messageHtml = textToHtmlParagraphs(message);

  const iconBlock = iconUrl
    ? `<img src="${escapeHtml(iconUrl)}" alt="${displayName}" width="120" height="120" style="display:block;width:120px;height:120px;object-fit:cover;margin:0 auto;" />`
    : `<div style="width:120px;height:120px;margin:0 auto;background:#f0f0f0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;letter-spacing:0.08em;color:#999;">${displayName}</div>`;

  const websiteBlock =
    websiteHref && websiteLabel
      ? `<a href="${escapeHtml(websiteHref)}" style="color:#20a398;text-decoration:none;font-size:13px;">${escapeHtml(websiteLabel)}</a>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(appName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eceae6;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eceae6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:400px;background-color:#ffffff;padding:40px 32px 32px;">
          <tr>
            <td style="text-align:center;">
              <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#888;font-family:Arial,Helvetica,sans-serif;">${displayName}</p>
              <h1 style="margin:0 0 28px;font-size:22px;font-weight:400;color:#333;line-height:1.35;font-family:Georgia,'Times New Roman',serif;">Your Mobile Gallery App is Ready</h1>
              <div style="margin:0 auto 28px;width:120px;height:120px;overflow:hidden;">${iconBlock}</div>
              <div style="margin-bottom:28px;">${messageHtml}</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 32px;">
                <tr>
                  <td align="center" style="background-color:#3a3a3a;">
                    <a href="${directLink}" style="display:block;padding:14px 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;">Install App</a>
                  </td>
                </tr>
              </table>
              <div style="font-size:13px;color:#888;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0 0 4px;font-weight:600;color:#555;">${escapeHtml(appName)}</p>
                ${websiteBlock ? `<p style="margin:0 0 4px;">${websiteBlock}</p>` : ''}
                <p style="margin:16px 0 0;font-size:12px;color:#aaa;">Questions? Reply to this email.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildInvitePlainText({
  appName,
  photographerName,
  message,
  directLink,
  websiteHref = null,
  websiteLabel = null,
}) {
  return [
    `${photographerName} sent you the ${appName} mobile gallery.`,
    '',
    message,
    '',
    'Install App:',
    directLink,
    '',
    websiteHref && websiteLabel ? `${websiteLabel}: ${websiteHref}` : '',
    '',
    'Questions? Reply to this email.',
  ]
    .filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
    .join('\n');
}

export const INVITE_EMAIL_TITLE = 'Your Mobile Gallery App is Ready';
export const INVITE_EMAIL_BUTTON_LABEL = 'Install App';
