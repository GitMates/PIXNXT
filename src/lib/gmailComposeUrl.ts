/**
 * Gmail web compose URL (Pixieset-style).
 * Opens compose with optional to/subject and body pre-filled.
 * @see https://mail.google.com/mail/u/0/?to&su&body=...&fs=1&tf=cm
 */
export function buildGmailComposeUrl(
  body: string,
  options?: { to?: string; subject?: string }
): string {
  const params = new URLSearchParams();
  params.set('to', options?.to ?? '');
  params.set('su', options?.subject ?? '');
  params.set('body', body);
  params.set('fs', '1');
  params.set('tf', 'cm');
  return `https://mail.google.com/mail/u/0/?${params.toString()}`;
}
