import { mobileGallerySettingsService } from './mobileGallerySettings.service';

export function resolveTemplateBody(body, { appName, senderName }) {
  return String(body || '')
    .replace(/\{\{appName\}\}/g, appName || 'your gallery')
    .replace(/\{\{senderName\}\}/g, senderName || 'Your photographer')
    .replace(/Your Name/g, senderName || 'Your photographer');
}

export function resolveTemplateSubject(subject, { appName }) {
  return String(subject || '').replace(/\{\{appName\}\}/g, appName || 'your gallery');
}

export function createDefaultEmailTemplates() {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Senior Shoot Sample Email',
      subject: 'Your {{appName}} mobile app is ready!',
      body: `Hi,

The photos of your senior session are ready for viewing! I had such a fun time photographing you, and I am very excited to share these photos with you!

I created a custom Mobile Gallery App for you to easily view the photos directly from your mobile device. Start by clicking on the Install App button in this email. Feel free to share this App with your family and friends!

I hope you enjoy the photos and please let me know if you have any questions. Have a great day!

Cheers,
Your Name`,
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Wedding Shoot Sample Email',
      subject: 'Your {{appName}} mobile app is ready!',
      body: `Hi,

Thank you so much for having me photograph your wedding! I had an amazing time celebrating with you and capturing your special day.

I created a custom Mobile Gallery App for you to easily view the photos directly from your mobile device. Start by clicking on the Install App button in this email. Feel free to share this App with your family and friends!

I hope you enjoy the photos and please let me know if you have any questions.

Cheers,
Your Name`,
      created_at: new Date().toISOString(),
    },
  ];
}

async function readTemplatesFromSettings(photographerId) {
  const settings = await mobileGallerySettingsService.getSettings(photographerId);
  return Array.isArray(settings.email_templates) ? settings.email_templates : null;
}

async function writeTemplatesToSettings(photographerId, templates) {
  await mobileGallerySettingsService.updateSettings(photographerId, {
    email_templates: templates,
  });
}

export const mobileGalleryEmailTemplatesService = {
  async getTemplates(photographerId) {
    if (!photographerId) return [];

    const stored = await readTemplatesFromSettings(photographerId);
    if (stored?.length) {
      return stored;
    }

    const defaults = createDefaultEmailTemplates();
    await writeTemplatesToSettings(photographerId, defaults);
    return defaults;
  },

  async saveTemplate(photographerId, template) {
    if (!photographerId || !template?.id) return null;

    const list = await this.getTemplates(photographerId);
    const idx = list.findIndex((t) => t.id === template.id);
    const next = {
      ...template,
      name: String(template.name || '').trim() || 'Untitled Template',
      updated_at: new Date().toISOString(),
    };

    if (idx === -1) {
      list.push({ ...next, created_at: next.created_at || new Date().toISOString() });
    } else {
      list[idx] = { ...list[idx], ...next };
    }

    await writeTemplatesToSettings(photographerId, list);
    return next;
  },

  async createTemplate(photographerId, partial = {}) {
    const template = {
      id: crypto.randomUUID(),
      name: partial.name?.trim() || 'New Template',
      subject: partial.subject ?? 'Your {{appName}} mobile app is ready!',
      body: partial.body ?? 'Hi,\n\n',
      created_at: new Date().toISOString(),
    };
    return this.saveTemplate(photographerId, template);
  },

  async deleteTemplate(photographerId, templateId) {
    if (!photographerId || !templateId) return;

    const list = (await this.getTemplates(photographerId)).filter((t) => t.id !== templateId);
    await writeTemplatesToSettings(photographerId, list);
  },
};
