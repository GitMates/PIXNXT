import exifr from 'exifr';

/** EXIF strings are sometimes NUL-padded; strip junk whitespace. */
function cleanTag(value) {
    return String(value || '')
        .replace(/\0/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function prettifyMake(make) {
    if (!make) return '';
    // "SONY" -> "Sony", leave mixed-case makes (Canon, Fujifilm) alone.
    if (make === make.toUpperCase() && make !== make.toLowerCase()) {
        return make.charAt(0).toUpperCase() + make.slice(1).toLowerCase();
    }
    return make;
}

/**
 * Badge label like "Sony ILCE-7M3". Avoids "Sony Sony ILCE-7M3" when Model
 * already includes the maker (common on Nikon / some phones).
 */
export function cameraLabelFromTags(tags) {
    if (!tags) return null;
    const make = prettifyMake(cleanTag(tags.Make ?? tags.make));
    const model = cleanTag(tags.Model ?? tags.model);
    if (!make && !model) return null;
    if (!make) return model;
    if (!model) return make;
    if (model.toLowerCase().startsWith(make.toLowerCase())) return model;
    return `${make} ${model}`;
}

/** Resolve stored row field whether API returned snake_case or camelCase. */
export function photoExifCameraLabel(photo) {
    if (!photo) return '';
    return cleanTag(photo.exif_camera ?? photo.exifCamera ?? '');
}

/** Parse `exif_details` JSON from a photo row (snake or camel). */
export function photoExifDetails(photo) {
    if (!photo) return null;
    const raw = photo.exif_details ?? photo.exifDetails ?? null;
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        const parsed = JSON.parse(String(raw));
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

/** Build API patch fields from extractImageDetails() output. */
export function exifDetailsToPatch(details) {
    if (!details) return null;
    const camera = cleanTag(details.cameraLabel) || null;
    const lens = cleanTag(details.lens) || null;
    const takenAt = cleanTag(details.dateTakenIso) || null;
    let exifDetails = null;
    try {
        exifDetails = JSON.stringify(details);
        if (exifDetails.length > 11000) exifDetails = JSON.stringify({
            cameraMaker: details.cameraMaker,
            cameraModel: details.cameraModel,
            cameraLabel: details.cameraLabel,
            lens: details.lens,
            iso: details.iso,
            fStop: details.fStop,
            exposureTime: details.exposureTime,
            exposureBias: details.exposureBias,
            exposureProgram: details.exposureProgram,
            meteringMode: details.meteringMode,
            flash: details.flash,
            focalLength: details.focalLength,
            dateTaken: details.dateTaken,
            dateTakenIso: details.dateTakenIso,
            width: details.width,
            height: details.height,
        });
    } catch {
        exifDetails = null;
    }
    return {
        exifCamera: camera,
        exifLens: lens,
        exifTakenAt: takenAt,
        exifDetails,
    };
}

/** Bytes to scan for IFD0 Make/Model on large RAW files (ARW/CR2/NEF). */
const EXIF_HEAD_BYTES = 8 * 1024 * 1024;

const EXIF_PARSE_OPTS = {
    // IFD0 holds Make/Model on JPEG and most RAW (ARW/CR2/NEF/DNG).
    tiff: true,
    ifd0: true,
    exif: true,
    // Sony ARW often mirrors Make/Model in XMP.
    xmp: true,
    mergeOutput: true,
    translateKeys: true,
    reviveValues: true,
};

const CAMERA_PICK = ['Make', 'Model'];
const DETAILS_PICK = [
    'Make',
    'Model',
    'LensModel',
    'Lens',
    'LensMake',
    'ISO',
    'ISOSpeedRatings',
    'PhotographicSensitivity',
    'FNumber',
    'ApertureValue',
    'ExposureTime',
    'ExposureBiasValue',
    'ExposureProgram',
    'MeteringMode',
    'Flash',
    'FocalLength',
    'DateTimeOriginal',
    'CreateDate',
    'DateTime',
    'ExifImageWidth',
    'ExifImageHeight',
    'ImageWidth',
    'ImageHeight',
    'WhiteBalance',
];

function asBlob(source) {
    if (!source) return null;
    if (source instanceof Blob) return source;
    return null;
}

async function tryParse(source, opts) {
    try {
        return await exifr.parse(source, opts);
    } catch {
        return null;
    }
}

function hasMakeOrModel(tags) {
    return Boolean(tags && (tags.Make || tags.Model || tags.make || tags.model));
}

/**
 * Parse EXIF from a File/Blob. Prefer a head slice so 20–40 MB ARWs don't need
 * a full read for Make/Model. Never mutates / consumes the caller's File.
 */
async function parseExifTags(blob, { pick = null } = {}) {
    const source = asBlob(blob);
    if (!source || source.size < 12) return null;

    const head =
        source.size > EXIF_HEAD_BYTES ? source.slice(0, EXIF_HEAD_BYTES) : source;

    const pickOpts = pick
        ? { ...EXIF_PARSE_OPTS, pick }
        : EXIF_PARSE_OPTS;

    let tags = await tryParse(head, pickOpts);
    if (hasMakeOrModel(tags) || (tags && !pick)) return tags;

    tags = await tryParse(source, pickOpts);
    if (hasMakeOrModel(tags) || (tags && !pick)) return tags;

    tags = await tryParse(source, EXIF_PARSE_OPTS);
    if (tags) return tags;

    return (await tryParse(source, undefined)) || null;
}

/**
 * Read the camera model from a photo file's EXIF (e.g. "Sony ILCE-7M3").
 * Never throws — returns null when tags are missing or unreadable.
 * Uses a sliced Blob so concurrent RAW preview reads of the same File stay safe.
 */
export async function extractExifCameraLabel(file) {
    try {
        const source = asBlob(file);
        if (!source) return null;
        // Independent slice — never call file.arrayBuffer() (locks / races RAW preview).
        const slice =
            source.size > EXIF_HEAD_BYTES ? source.slice(0, EXIF_HEAD_BYTES) : source.slice(0);
        let tags = await parseExifTags(slice, { pick: CAMERA_PICK });
        if (!cameraLabelFromTags(tags) && source.size > EXIF_HEAD_BYTES) {
            tags = await parseExifTags(source, { pick: CAMERA_PICK });
        }
        return cameraLabelFromTags(tags);
    } catch {
        return null;
    }
}

function formatExposureTime(seconds) {
    const t = Number(seconds);
    if (!Number.isFinite(t) || t <= 0) return '';
    if (t >= 1) return `${Number(t.toFixed(1))} sec.`;
    return `1/${Math.round(1 / t)} sec.`;
}

function formatFNumber(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return '';
    return `f/${Number(v.toFixed(1))}`;
}

function formatFocalLength(mm) {
    const v = Number(mm);
    if (!Number.isFinite(v) || v <= 0) return '';
    return `${Number(v.toFixed(v < 10 ? 1 : 0))} mm`;
}

function formatExposureBias(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return `${n === 0 ? '0' : Number(n.toFixed(1))} step`;
}

function formatDateTaken(d) {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTakenIso(d) {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString();
}

/**
 * Windows File Explorer Flash wording (e.g. "No flash, compulsory").
 * EXIF Flash bits: 0 = fired, 3–4 = mode (1 fire / 2 suppress / 3 auto).
 */
function formatFlashMode(flash) {
    const v = Number(flash);
    if (!Number.isFinite(v)) return '';
    const fired = (v & 1) === 1;
    const mode = (v >> 3) & 0x3;
    if (!fired && mode === 2) return 'No flash, compulsory';
    if (!fired && mode === 1) return 'No flash, compulsory';
    if (!fired && mode === 3) return 'No flash, auto';
    if (!fired) return 'No flash';
    if (mode === 1) return 'Flash fired, compulsory';
    if (mode === 3) return 'Flash fired, auto';
    if (mode === 2) return 'Flash fired';
    return 'Flash fired';
}

const EXPOSURE_PROGRAMS = {
    0: 'Not defined',
    1: 'Manual',
    2: 'Normal',
    3: 'Aperture priority',
    4: 'Shutter priority',
    5: 'Creative',
    6: 'Action',
    7: 'Portrait',
    8: 'Landscape',
};

/** Windows uses "Pattern" for EXIF metering 5 (multi-segment). */
const METERING_MODES = {
    0: 'Unknown',
    1: 'Average',
    2: 'Center weighted',
    3: 'Spot',
    4: 'Multi-spot',
    5: 'Pattern',
    6: 'Partial',
};

/**
 * Full shooting details for the Details view (Windows-style properties pane).
 * Returns null when nothing readable is found; never throws.
 */
export async function extractImageDetails(blob) {
    try {
        const source = asBlob(blob);
        if (!source || source.size < 12) return null;
        const tags = await parseExifTags(source, { pick: DETAILS_PICK });
        if (!tags) return null;
        const make = prettifyMake(cleanTag(tags.Make ?? tags.make));
        const model = cleanTag(tags.Model ?? tags.model);
        const isoRaw = tags.ISO ?? tags.ISOSpeedRatings ?? tags.PhotographicSensitivity;
        const takenRaw = tags.DateTimeOriginal || tags.CreateDate || tags.DateTime || null;
        const details = {
            cameraMaker: make || '',
            cameraModel: model || '',
            cameraLabel: cameraLabelFromTags(tags) || '',
            lens: cleanTag(tags.LensModel || tags.Lens || tags.LensMake),
            iso: Number.isFinite(Number(isoRaw)) ? `ISO-${isoRaw}` : '',
            fStop: formatFNumber(tags.FNumber ?? tags.ApertureValue),
            exposureTime: formatExposureTime(tags.ExposureTime),
            focalLength: formatFocalLength(tags.FocalLength),
            dateTaken: takenRaw ? formatDateTaken(takenRaw) : '',
            dateTakenIso: takenRaw ? formatDateTakenIso(takenRaw) : '',
            exposureBias:
                tags.ExposureBiasValue !== undefined && tags.ExposureBiasValue !== null
                    ? formatExposureBias(tags.ExposureBiasValue)
                    : '',
            exposureProgram: EXPOSURE_PROGRAMS[Number(tags.ExposureProgram)] || '',
            meteringMode: METERING_MODES[Number(tags.MeteringMode)] || '',
            flash:
                tags.Flash !== undefined && tags.Flash !== null
                    ? formatFlashMode(tags.Flash)
                    : '',
            whiteBalance:
                tags.WhiteBalance !== undefined && tags.WhiteBalance !== null
                    ? Number(tags.WhiteBalance) === 1
                        ? 'Manual'
                        : 'Auto'
                    : '',
            width: Number(tags.ExifImageWidth || tags.ImageWidth) || null,
            height: Number(tags.ExifImageHeight || tags.ImageHeight) || null,
        };
        const hasAny = Object.values(details).some((v) => v !== '' && v !== null);
        return hasAny ? details : null;
    } catch {
        return null;
    }
}

/** Split a stored "Sony ILCE-7M3" label into maker / model for Details rows. */
export function splitCameraLabel(label) {
    const text = cleanTag(label);
    if (!text) return { maker: '', model: '' };
    const known = [
        'Sony',
        'Canon',
        'Nikon',
        'Fujifilm',
        'Olympus',
        'Panasonic',
        'Leica',
        'Ricoh',
        'Pentax',
        'Samsung',
        'Apple',
        'Google',
        'Huawei',
        'Xiaomi',
    ];
    for (const make of known) {
        if (text.toLowerCase().startsWith(make.toLowerCase() + ' ')) {
            return { maker: make, model: text.slice(make.length).trim() };
        }
        if (text.toLowerCase() === make.toLowerCase()) {
            return { maker: make, model: '' };
        }
    }
    const parts = text.split(/\s+/);
    if (parts.length >= 2) {
        return { maker: parts[0], model: parts.slice(1).join(' ') };
    }
    return { maker: '', model: text };
}
