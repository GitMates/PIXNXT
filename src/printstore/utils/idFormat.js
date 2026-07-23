/**
 * Generates a deterministic 10-character short ID from a UUID.
 * Format: Prefix (2 chars) + 8 digits (e.g. OR12345678)
 * 
 * @param {string} uuid - The input UUID or existing short ID
 * @param {'order'|'tracking'|'packing'|'qc'|'print'|'dispatch'|'employee'} type - The type of ID
 * @returns {string} - The formatted short ID
 */
export const getShortId = (uuid, type) => {
  if (!uuid) return '';
  const prefixMap = {
    order: 'OR',
    tracking: 'TD',
    packing: 'PI',
    qc: 'QC',
    print: 'PQ',
    dispatch: 'DI',
    employee: 'EI',
    frame: 'FI'
  };
  const prefix = prefixMap[type] || 'OR';
  
  // If already in short ID format, return it
  const shortIdRegex = new RegExp(`^${prefix}\\d{8}$`, 'i');
  if (shortIdRegex.test(uuid)) {
    return uuid.toUpperCase();
  }

  // Generate a deterministic 32-bit hash from the UUID string
  let hash = 0;
  const str = String(uuid).toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const numericPart = Math.abs(hash) % 100000000;
  return `${prefix}${String(numericPart).padStart(8, '0')}`;
};
