/**
 * Minimal gallery chrome strings for Basics → Language.
 * Keeps visitor UI readable without a full i18n framework.
 */

const STRINGS = {
  English: {
    download: 'Download',
    favorites: 'Favorites',
    share: 'Share',
    slideshow: 'Slideshow',
    shop: 'Shop',
    walkTitle: 'How this gallery works',
    walkBrowse: 'Browse photos by set using the tabs above.',
    walkFavorite: 'Tap the heart to save favorites for your photographer.',
    walkDownload: 'Download photos when downloads are available.',
    walkShare: 'Share individual photos when sharing is on.',
    walkGotIt: 'Got it',
    walkSkip: 'Skip',
  },
  Hindi: {
    download: 'डाउनलोड',
    favorites: 'पसंदीदा',
    share: 'शेयर',
    slideshow: 'स्लाइडशो',
    shop: 'दुकान',
    walkTitle: 'यह गैलरी कैसे काम करती है',
    walkBrowse: 'ऊपर टैब से सेट के अनुसार फ़ोटो देखें।',
    walkFavorite: 'अपने फ़ोटोग्राफ़र के लिए पसंदीदा सेव करने हेतु दिल पर टैप करें।',
    walkDownload: 'जब डाउनलोड उपलब्ध हो, फ़ोटो डाउनलोड करें।',
    walkShare: 'शेयर चालू होने पर अलग-अलग फ़ोटो शेयर करें।',
    walkGotIt: 'समझ गया',
    walkSkip: 'छोड़ें',
  },
  Tamil: {
    download: 'பதிவிறக்கம்',
    favorites: 'பிடித்தவை',
    share: 'பகிர்',
    slideshow: 'ஸ்லைடுஷோ',
    shop: 'கடை',
    walkTitle: 'இந்த கேலரி எப்படி வேலை செய்கிறது',
    walkBrowse: 'மேலே உள்ள தாவல்களால் செட் வாரியாக புகைப்படங்களைப் பாருங்கள்.',
    walkFavorite: 'உங்கள் புகைப்படக்காரருக்காக பிடித்தவை சேமிக்க இதயத்தைத் தொடவும்.',
    walkDownload: 'பதிவிறக்கம் இருந்தால் புகைப்படங்களைப் பதிவிறக்கவும்.',
    walkShare: 'பகிர்வு இயக்கத்தில் இருக்கும்போது தனிப்பட்ட புகைப்படங்களைப் பகிரவும்.',
    walkGotIt: 'புரிந்தது',
    walkSkip: 'தவிர்',
  },
};

export function normalizeGalleryLanguage(raw) {
  const s = String(raw || 'English').trim();
  const lower = s.toLowerCase();
  if (lower.startsWith('hi') || lower === 'hindi' || s === 'हिन्दी') return 'Hindi';
  if (lower.startsWith('ta') || lower === 'tamil' || s === 'தமிழ்') return 'Tamil';
  return 'English';
}

export function galleryHtmlLang(language) {
  const id = normalizeGalleryLanguage(language);
  if (id === 'Hindi') return 'hi';
  if (id === 'Tamil') return 'ta';
  return 'en';
}

export function galleryUiStrings(language) {
  const id = normalizeGalleryLanguage(language);
  return STRINGS[id] || STRINGS.English;
}
