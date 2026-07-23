import { supabase } from '../lib/supabase/client';

export function resolveTemplateBody(body, { collectionName, daysPrior, expiryDate }) {
  return String(body || '')
    .replace(/\{collection\.name\}/g, collectionName || '[COLLECTION NAME]')
    .replace(/\{days\.prior\}/g, daysPrior || '[DAYS]')
    .replace(/\{expiry\.date\}/g, expiryDate || '[DATE]');
}

export function createDefaultEmailTemplates() {
  return [
    {
      id: 'default-wedding',
      name: 'Wedding Sample Email',
      subject: 'Photos of your wedding are ready',
      body: `Hi,\n\nThanks again for sharing your special day with me! I had an incredible time photographing the two of you, and I am very excited to share the photos with you!\n\nClick on the View Gallery button to view your personalized gallery. Feel free to then share this gallery with your family and friends.\n\nI hope you enjoy the photos and please let me know if you have any questions. Have a great day!\n\nCheers,\nYour Name`,
      created_at: new Date().toISOString(),
      isSystem: true,
      category: 'collection-sharing'
    },
    {
      id: 'default-newborn',
      name: 'Newborn Sample Email',
      subject: 'Photos of your newborn are ready',
      body: `Hi,\n\nThe photos for your little one are ready for viewing! It was an honour taking photos of the newest addition to your family. It was so much fun and I hope you like the photos!\n\nYour gallery can be viewed by clicking on the View Gallery button in this email. Feel free to then share this gallery with your family and friends.\n\nLooking forward to capturing his next big milestone!\n\nCheers,\nYour Name`,
      created_at: new Date().toISOString(),
      isSystem: true,
      category: 'collection-sharing'
    },
    {
      id: 'default-auto-expiry',
      name: 'Auto Expiry Reminder',
      subject: 'The gallery {collection.name} is about to expire',
      body: `Hi,\n\nThe gallery {collection.name} will expire in {days.prior} on {expiry.date}. You will no longer be able to access this gallery after the expiry date.\n\nIf you have any questions, please don't hesitate to get in touch!\n\nCheers,\nYour Name`,
      created_at: new Date().toISOString(),
      isSystem: true,
      category: 'auto-expiry'
    },
  ];
}

async function readTemplatesFromProfile(photographerId) {
  const { data, error } = await supabase
    .from('photographers')
    .select('client_gallery_email_templates')
    .eq('id', photographerId)
    .single();
  
  if (error || !data) return null;
  return Array.isArray(data.client_gallery_email_templates) ? data.client_gallery_email_templates : null;
}

async function writeTemplatesToProfile(photographerId, templates) {
  const { error } = await supabase
    .from('photographers')
    .update({ client_gallery_email_templates: templates })
    .eq('id', photographerId);
  
  if (error) {
    console.error('Failed to save email templates to DB, falling back to local storage', error);
    localStorage.setItem(`client_gallery_email_templates_${photographerId}`, JSON.stringify(templates));
  }
}

export const clientGalleryEmailTemplatesService = {
  async getTemplates(photographerId) {
    if (!photographerId) return [];

    let stored = await readTemplatesFromProfile(photographerId);
    if (!stored) {
       const localStored = localStorage.getItem(`client_gallery_email_templates_${photographerId}`);
       if (localStored) {
           stored = JSON.parse(localStored);
       }
    }
    
    if (stored && stored.length > 0) {
      // Ensure system templates are present if they were deleted somehow or new ones added
      const defaults = createDefaultEmailTemplates();
      const combined = [...stored];
      for (const def of defaults) {
          if (!combined.find(t => t.id === def.id)) {
              combined.push(def);
          }
      }
      return combined;
    }

    const defaults = createDefaultEmailTemplates();
    await writeTemplatesToProfile(photographerId, defaults);
    return defaults;
  },

  async getTemplateById(photographerId, templateId) {
    const templates = await this.getTemplates(photographerId);
    return templates.find(t => t.id === templateId) || null;
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

    await writeTemplatesToProfile(photographerId, list);
    return next;
  },

  async createTemplate(photographerId, partial = {}) {
    const template = {
      id: crypto.randomUUID(),
      name: partial.name?.trim() || 'Untitled Template',
      subject: partial.subject ?? '',
      body: partial.body ?? 'Enter your text here',
      category: 'collection-sharing',
      isSystem: false,
      created_at: new Date().toISOString(),
    };
    return this.saveTemplate(photographerId, template);
  },

  async deleteTemplate(photographerId, templateId) {
    if (!photographerId || !templateId) return;

    let list = await this.getTemplates(photographerId);
    list = list.filter((t) => t.id !== templateId);
    await writeTemplatesToProfile(photographerId, list);
  },
  
  async resetTemplate(photographerId, templateId) {
      const defaults = createDefaultEmailTemplates();
      const defaultTpl = defaults.find(t => t.id === templateId);
      if (defaultTpl) {
          return this.saveTemplate(photographerId, defaultTpl);
      }
      return null;
  }
};
