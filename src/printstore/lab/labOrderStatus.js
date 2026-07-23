/**
 * Single source of truth for Print Lab order statuses.
 * Must stay in sync with printstore_orders.status CHECK constraint
 * (see lab_order_status_machine.sql).
 */

export const LAB_ORDER_STATUSES = Object.freeze([
  'pending',
  'artwork_review',
  'printing',
  'printed',
  'framing',
  'packaging',
  'ready_to_ship',
  'shipped',
  'completed',
  'reprint',
  'cancelled',
]);

/** Ordered production pipeline (excludes reprint / cancelled). */
export const LAB_PIPELINE_STEPS = Object.freeze([
  { key: 'pending', step: 1, shortLabel: 'Intake' },
  { key: 'artwork_review', step: 2, shortLabel: 'Artwork' },
  { key: 'printing', step: 3, shortLabel: 'Print' },
  { key: 'printed', step: 4, shortLabel: 'QC' },
  { key: 'framing', step: 5, shortLabel: 'Frame' },
  { key: 'packaging', step: 6, shortLabel: 'Pack' },
  { key: 'ready_to_ship', step: 7, shortLabel: 'Ready' },
  { key: 'shipped', step: 8, shortLabel: 'Ship' },
  { key: 'completed', step: 9, shortLabel: 'Done' },
]);

export const LAB_STATUS_LABELS = Object.freeze({
  pending: 'New Order',
  artwork_review: 'Artwork Review',
  printing: 'Printing',
  printed: 'Printed (QC)',
  framing: 'Frame Workshop',
  packaging: 'Packaging',
  ready_to_ship: 'Ready To Ship',
  shipped: 'Shipped',
  completed: 'Delivered',
  reprint: 'Reprint Required',
  cancelled: 'Cancelled',
});

export const LAB_STATUS_COLORS = Object.freeze({
  pending: '#3498db',
  artwork_review: '#0ea5e9',
  printing: '#9b59b6',
  printed: '#0d9488',
  framing: '#1e40af',
  packaging: '#d35400',
  ready_to_ship: '#1abc9c',
  shipped: '#2ecc71',
  completed: '#27ae60',
  reprint: '#e74c3c',
  cancelled: '#95a5a6',
});

/** Customer-facing tracking copy (also used by DB trigger labels). */
export const LAB_STATUS_TRACKING = Object.freeze({
  pending: {
    label: 'Order placed',
    description: 'Your order has been successfully placed.',
  },
  artwork_review: {
    label: 'Artwork review',
    description: 'The lab is reviewing crop, resolution, and print readiness.',
  },
  printing: {
    label: 'Printing started',
    description: 'The lab has started printing your high-resolution images.',
  },
  printed: {
    label: 'Printed (QC)',
    description: 'Prints are complete and undergoing quality control.',
  },
  framing: {
    label: 'Frame workshop',
    description: 'Your print is being matted and framed in the workshop.',
  },
  packaging: {
    label: 'Packaging',
    description: 'Your order is being packaged securely.',
  },
  ready_to_ship: {
    label: 'Ready to deliver',
    description: 'Your package is ready for dispatch.',
  },
  shipped: {
    label: 'Dispatched',
    description: 'Your package has been dispatched.',
  },
  completed: {
    label: 'Delivered',
    description: 'Your order has been successfully delivered.',
  },
  reprint: {
    label: 'Reprint required',
    description: 'A QC check triggered a reprint for perfection.',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This order has been cancelled.',
  },
});

/**
 * Allowed next statuses from each current status.
 * Includes current status so UI selects can show the active value.
 */
export const LAB_STATUS_TRANSITIONS = Object.freeze({
  pending: ['pending', 'artwork_review', 'printing', 'cancelled'],
  artwork_review: ['artwork_review', 'printing', 'cancelled'],
  printing: ['printing', 'printed', 'reprint', 'cancelled'],
  printed: ['printed', 'framing', 'packaging', 'printing', 'reprint', 'cancelled'],
  framing: ['framing', 'packaging', 'reprint', 'cancelled'],
  packaging: ['packaging', 'ready_to_ship', 'cancelled'],
  ready_to_ship: ['ready_to_ship', 'shipped', 'cancelled'],
  shipped: ['shipped', 'completed'],
  reprint: ['reprint', 'printing', 'cancelled'],
  completed: ['completed'],
  cancelled: ['cancelled'],
});

/** Which lab station owns each status (for routing / filters). */
export const LAB_STATUS_STATION = Object.freeze({
  pending: 'intake',
  artwork_review: 'artwork',
  printing: 'print',
  printed: 'qc',
  framing: 'frame',
  packaging: 'packaging',
  ready_to_ship: 'delivery',
  shipped: 'dispatch',
  completed: 'dispatch',
  reprint: 'reprint',
  cancelled: 'intake',
});

export function isLabOrderStatus(status) {
  return LAB_ORDER_STATUSES.includes(status);
}

export function getLabStatusLabel(status) {
  return LAB_STATUS_LABELS[status] || status || 'Unknown';
}

export function getLabStatusColor(status) {
  return LAB_STATUS_COLORS[status] || '#64748b';
}

export function getValidNextLabStatuses(current) {
  if (!current || !LAB_STATUS_TRANSITIONS[current]) {
    return current ? [current] : [];
  }
  return [...LAB_STATUS_TRANSITIONS[current]];
}

export function canTransitionLabStatus(from, to) {
  if (!from || !to) return false;
  if (from === to) return true;
  const allowed = LAB_STATUS_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

/** Pipeline index for progress UI (-1 if reprint/cancelled/unknown). */
export function getLabPipelineIndex(status) {
  return LAB_PIPELINE_STEPS.findIndex((s) => s.key === status);
}

export function isLabPipelineStatusDone(status, stepKey) {
  const currentIdx = getLabPipelineIndex(status);
  const stepIdx = LAB_PIPELINE_STEPS.findIndex((s) => s.key === stepKey);
  if (currentIdx < 0 || stepIdx < 0) return false;
  if (status === 'reprint' || status === 'cancelled') return false;
  return stepIdx < currentIdx;
}

export function isLabPipelineStatusActive(status, stepKey) {
  return status === stepKey;
}
