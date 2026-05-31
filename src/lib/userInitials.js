/** Display name for profile headers (sidebar, account settings). */
export function getUserDisplayLabel(user) {
    if (!user) return 'Photographer';

    const meta = user.user_metadata || {};
    const fromMeta =
        meta.display_name ||
        meta.full_name ||
        meta.name ||
        meta.business_name;

    if (fromMeta && String(fromMeta).trim()) {
        return String(fromMeta).trim();
    }

    if (user.display_name && String(user.display_name).trim()) {
        return String(user.display_name).trim();
    }

    const emailPrefix = String(user.email || '').split('@')[0];
    if (emailPrefix) return emailPrefix;

    return 'Photographer';
}

/** Single character avatar initial. */
export function getUserInitial(user) {
    const label = getUserDisplayLabel(user);
    if (label && label !== 'Photographer') {
        return label.charAt(0).toUpperCase();
    }
    if (user?.email) {
        return user.email.charAt(0).toUpperCase();
    }
    return 'U';
}
