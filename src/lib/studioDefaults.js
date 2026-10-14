/**
 * Studio-wide delivery defaults stored on photographers.
 * Applied when creating new deliveries; each delivery can override.
 */

export const DEFAULT_GUEST_DELIVERY = {
    enabled: false,
    regClose: '48h',
    autoBatches: true,
    channel: 'whatsapp',
    arrival: 'next_day',
    slipMessage: true,
    standee: 'classic',
    languages: ['en', 'ta'],
};

export const DEFAULT_FACE_MATCHING = {
    matchCertainty: 'strict',
    holdLowConfidence: true,
    sendHighlightsWhenEmpty: true,
    guestSelfClaim: true,
};

export const DEFAULT_ACCESS = {
    whoCanOpen: 'anyone',
};

function mergeDefaults(defaults, raw) {
    if (!raw || typeof raw !== 'object') return { ...defaults };
    return { ...defaults, ...raw };
}

export function resolveGuestDeliveryDefaults(profile) {
    const merged = mergeDefaults(DEFAULT_GUEST_DELIVERY, profile?.guest_delivery_defaults);
    return {
        ...merged,
        languages: Array.isArray(merged.languages) ? merged.languages : DEFAULT_GUEST_DELIVERY.languages,
    };
}

export function resolveFaceMatchingDefaults(profile) {
    return mergeDefaults(DEFAULT_FACE_MATCHING, profile?.face_matching_defaults);
}

export function resolveAccessDefaults(profile) {
    return mergeDefaults(DEFAULT_ACCESS, profile?.access_defaults);
}

/** Snapshot helpers for persisting current UI state. */
/** Options copied onto a new delivery's guest event. Later settings changes do not rewrite it. */
export function guestDeliveryEventSettings(profile) {
    const d = resolveGuestDeliveryDefaults(profile);
    return {
        languages: d.languages,
        standee: d.standee,
        arrival: d.arrival,
        channel: 'whatsapp',
        regClose: d.regClose,
        autoBatches: d.autoBatches,
        slipMessage: d.slipMessage,
    };
}

/** This delivery's saved options, filled from the studio default where the delivery has none yet. */
export function resolveDeliveryGuestSettings(event, profile) {
    const studio = guestDeliveryEventSettings(profile);
    const own = event?.settings && typeof event.settings === 'object' ? event.settings : {};
    const languages = Array.isArray(own.languages) && own.languages.length
        ? own.languages
        : studio.languages;
    return {
        ...studio,
        ...own,
        languages: languages.includes('en') ? languages : ['en', ...languages],
        standee: own.standee || studio.standee,
        arrival: own.arrival || studio.arrival,
        channel: 'whatsapp',
    };
}

export function guestDeliveryPayload(state) {
    return {
        enabled: !!state.enabled,
        regClose: state.regClose,
        autoBatches: !!state.autoBatches,
        channel: 'whatsapp',
        arrival: state.arrival,
        slipMessage: !!state.slipMessage,
        standee: state.standee,
        languages: Array.isArray(state.languages) ? state.languages : DEFAULT_GUEST_DELIVERY.languages,
    };
}

export function faceMatchingPayload(state) {
    return {
        matchCertainty: state.matchCertainty,
        holdLowConfidence: !!state.holdLowConfidence,
        sendHighlightsWhenEmpty: !!state.sendHighlightsWhenEmpty,
        guestSelfClaim: !!state.guestSelfClaim,
    };
}

export function accessDefaultsPayload(state) {
    return {
        whoCanOpen: state.whoCanOpen,
    };
}
