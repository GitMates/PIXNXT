import { toDeliveryDesignPatch } from './designSettingsPersist';

/** Stable ids for the two templates that always exist. */
export const BUILTIN_TEMPLATE_KEYS = ['wedding', 'shoot'];

const EDITOR_DEFAULTS = {
  coverStyle: 'center',
  typography: 'sans',
  colorTheme: 'light',
  gridStyle: 'vertical',
  thumbnailSize: 'regular',
  gridSpacing: 'regular',
  navigationStyle: 'icon',
  socialSharing: true,
  slideshow: true,
  photoDownload: true,
  highResolutionDownload: true,
  webSizeDownload: true,
  videoDownload: false,
  downloadPin: true,
  favoritePhotos: true,
  favoriteNotes: true,
  storeStatus: true,
  showOnShowcase: true,
  collectionPassword: false,
  emailRegistration: false,
  galleryAssist: false,
  language: 'English',
  defaultWatermark: '',
  watermarkEnabled: false,
  guestDelivery: false,
  galleryCloseDays: 0,
};

const CATALOG = {
  wedding: {
    name: 'Wedding',
    settings: {
      guestDelivery: true,
      watermarkEnabled: true,
      galleryCloseDays: 90,
      isDefault: true,
    },
  },
  shoot: {
    name: 'Shoot',
    settings: {
      guestDelivery: false,
      watermarkEnabled: true,
      galleryCloseDays: 60,
      isDefault: false,
    },
  },
};

let ensureInflight = null;

export function parsePresetSettings(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

export function builtinKeyOf(preset) {
  const settings = parsePresetSettings(preset?.settings);
  const key = String(settings.builtinKey || '').toLowerCase();
  if (BUILTIN_TEMPLATE_KEYS.includes(key)) return key;
  const name = String(preset?.name || '').trim().toLowerCase();
  if (BUILTIN_TEMPLATE_KEYS.includes(name)) return name;
  return '';
}

export function isProtectedTemplate(preset) {
  return Boolean(builtinKeyOf(preset));
}

export function builtinSettings(key) {
  const spec = CATALOG[key];
  if (!spec) return { ...EDITOR_DEFAULTS };
  return {
    ...EDITOR_DEFAULTS,
    ...spec.settings,
    builtinKey: key,
    protected: true,
  };
}

export function watermarkIsOn(settings = {}) {
  if (settings.watermarkEnabled === false) return false;
  if (settings.watermarkEnabled === true) return true;
  const mark = String(settings.defaultWatermark || '').trim();
  return Boolean(mark) && mark !== 'No watermark';
}

function onOff(value) {
  return value ? 'on' : 'off';
}

export function describeTemplate(settings = {}) {
  const days = Number(settings.galleryCloseDays);
  const closes = Number.isFinite(days) && days > 0;
  const guests = Boolean(settings.guestDelivery);
  const watermark = watermarkIsOn(settings);
  const access = settings.collectionPassword ? 'Password required' : 'Anyone with the link';
  const lang = settings.language || 'English';
  return {
    guests,
    access,
    wm: watermark ? 'On' : 'Off',
    expiry: closes ? `${days} days after publishing` : 'Does not close',
    lang,
    hint: [
      `Guest delivery ${onOff(guests)}`,
      settings.collectionPassword ? 'password required' : 'anyone with the link',
      `watermark ${onOff(watermark)}`,
      closes ? `closes in ${days} days` : 'does not close',
      `language ${lang}`,
    ].join(', '),
  };
}

export function sortDeliveryTemplates(presets) {
  const rank = (preset) => {
    const key = builtinKeyOf(preset);
    if (key === 'wedding') return 0;
    if (key === 'shoot') return 1;
    return 2;
  };
  return [...(presets || [])].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    return String(a?.created_at || '').localeCompare(String(b?.created_at || ''));
  });
}

/**
 * Wedding and Shoot cards on New delivery. Saved template settings win;
 * missing fields fall back to the built-in defaults.
 */
export function builtinTemplatesFromList(presets) {
  return BUILTIN_TEMPLATE_KEYS.map((key) => {
    const found = (presets || []).find((preset) => builtinKeyOf(preset) === key);
    const saved = parsePresetSettings(found?.settings);
    return {
      key,
      id: found?.id || null,
      name: found?.name || CATALOG[key].name,
      settings: { ...builtinSettings(key), ...saved, builtinKey: key },
    };
  });
}

/**
 * Every delivery template for the New delivery picker.
 * Wedding and Shoot stay first. Templates created in Settings follow them.
 */
export function deliveryTemplatesFromList(presets) {
  const seenBuiltin = new Set();
  const list = [];
  for (const preset of sortDeliveryTemplates(presets)) {
    const builtin = builtinKeyOf(preset);
    if (builtin) {
      if (seenBuiltin.has(builtin)) continue;
      seenBuiltin.add(builtin);
      const saved = parsePresetSettings(preset.settings);
      list.push({
        key: builtin,
        id: preset.id || null,
        name: preset.name || CATALOG[builtin].name,
        settings: { ...builtinSettings(builtin), ...saved, builtinKey: builtin },
      });
      continue;
    }
    if (!preset?.id) continue;
    const name = String(preset.name || '').trim() || 'Untitled template';
    list.push({
      key: String(preset.id),
      id: preset.id,
      name,
      settings: { ...EDITOR_DEFAULTS, ...parsePresetSettings(preset.settings) },
    });
  }
  for (const key of BUILTIN_TEMPLATE_KEYS) {
    if (seenBuiltin.has(key)) continue;
    list.push({
      key,
      id: null,
      name: CATALOG[key].name,
      settings: builtinSettings(key),
    });
  }
  const rank = (item) => (item.key === 'wedding' ? 0 : item.key === 'shoot' ? 1 : 2);
  return list.sort((a, b) => rank(a) - rank(b));
}

export function preferredTemplateKey(templates) {
  const list = templates || [];
  const marked = list.find((template) => template?.settings?.isDefault);
  if (marked?.key) return marked.key;
  return list.some((template) => template.key === 'wedding') ? 'wedding' : list[0]?.key || 'wedding';
}

function languageToDb(value) {
  const raw = String(value || 'english').trim().toLowerCase();
  return raw || 'english';
}

/** Delivery columns written when a template is chosen for a new delivery. */
export function presetToDeliveryPatch(settings = {}, presetId) {
  const design = toDeliveryDesignPatch({
    coverStyle: settings.coverStyle || 'center',
    fontFamily: settings.typography,
    colorPalette: settings.colorTheme,
    grid: {
      style: settings.gridStyle || 'vertical',
      size: settings.thumbnailSize || 'regular',
      spacing: settings.gridSpacing || 'regular',
      navigation: settings.navigationStyle === 'text' ? 'text' : 'icon',
    },
  });
  const downloadsOn = settings.photoDownload !== false;
  const patch = {
    ...design,
    privacy: settings.collectionPassword ? 'password' : 'public',
    show_on_showcase: (settings.showOnShowcase ?? settings.showOnHomepage) !== false ? 1 : 0,
    downloads_enabled: downloadsOn ? 1 : 0,
    gallery_download_enabled: downloadsOn ? 1 : 0,
    single_photo_download_enabled: downloadsOn ? 1 : 0,
    favorites_enabled: settings.favoritePhotos !== false ? 1 : 0,
    favorites_allow_comments: settings.favoriteNotes !== false ? 1 : 0,
    store_enabled: settings.storeStatus !== false ? 1 : 0,
    slideshow_enabled: settings.slideshow !== false ? 1 : 0,
    social_sharing_enabled: settings.socialSharing !== false ? 1 : 0,
    gallery_assist: settings.galleryAssist ? 1 : 0,
    watermark_enabled: watermarkIsOn(settings) ? 1 : 0,
    email_capture_enabled: settings.emailRegistration ? 1 : 0,
    language: languageToDb(settings.language),
    guest_delivery_enabled: settings.guestDelivery ? 1 : 0,
  };
  if (presetId) patch.preset_id = presetId;
  const mark = String(settings.defaultWatermark || '').trim();
  if (mark && mark !== 'No watermark') patch.default_watermark = mark;
  return patch;
}

/** Create Wedding and Shoot once per studio so Settings and New delivery share them. */
export function ensureDefaultDeliveryTemplates() {
  if (ensureInflight) return ensureInflight;
  ensureInflight = (async () => {
    const { listPresets, createPreset, updatePreset } = await import('../services/workersGallery.service');
    const existing = await listPresets();
    const anyDefault = existing.some((preset) => parsePresetSettings(preset.settings).isDefault);
    const stamped = [];
    for (const preset of existing) {
      const key = builtinKeyOf(preset);
      if (!key) {
        stamped.push(preset);
        continue;
      }
      const saved = parsePresetSettings(preset.settings);
      if (saved.builtinKey === key && saved.protected === true) {
        stamped.push(preset);
        continue;
      }
      const defaults = builtinSettings(key);
      const settings = {
        ...defaults,
        ...saved,
        builtinKey: key,
        protected: true,
      };
      if (saved.isDefault === undefined) {
        settings.isDefault = key === 'wedding' && !anyDefault;
      }
      try {
        const updated = await updatePreset(preset.id, { settings });
        stamped.push(updated || { ...preset, settings });
      } catch (err) {
        console.error('Failed to connect built-in delivery template:', err);
        stamped.push({ ...preset, settings });
      }
    }
    const have = new Set(stamped.map(builtinKeyOf).filter(Boolean));
    const created = [];
    for (const key of BUILTIN_TEMPLATE_KEYS) {
      if (have.has(key)) continue;
      const settings = builtinSettings(key);
      if (key === 'wedding' && anyDefault) settings.isDefault = false;
      const row = await createPreset(CATALOG[key].name, settings);
      if (row) created.push(row);
    }
    return sortDeliveryTemplates([...stamped, ...created]);
  })().finally(() => {
    ensureInflight = null;
  });
  return ensureInflight;
}
