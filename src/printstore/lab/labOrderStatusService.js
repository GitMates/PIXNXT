import { apiFetch } from '../../lib/api/client';
import {
  canTransitionLabStatus,
  getLabStatusLabel,
  isLabOrderStatus,
} from './labOrderStatus';

/**
 * Strict DB-backed lab order status transitions.
 * Updates public.printstore_orders.status only — tracking rows are written
 * by the log_printstore_order_status_change trigger when present.
 */

function assertStatus(status, fieldName = 'status') {
  if (!isLabOrderStatus(status)) {
    throw new Error(`Invalid lab ${fieldName}: "${status}"`);
  }
}

/**
 * D1 returns JSON columns (options, shipping_address, notes) as TEXT —
 * normalize after every Workers read.
 */
function parseJsonField(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

export function normalizeLabOrderRow(order) {
  if (!order) return order;
  return {
    ...order,
    shipping_address: parseJsonField(order.shipping_address, order.shipping_address || {}),
  };
}

export function normalizeLabItemRow(item) {
  if (!item) return item;
  return { ...item, options: parseJsonField(item.options, {}) };
}

/**
 * @param {string} orderId
 * @param {string} nextStatus
 * @param {{ fromStatus?: string, skipTransitionCheck?: boolean }} [options]
 * @returns {Promise<{ order: object }>}
 */
export async function transitionLabOrderStatus(orderId, nextStatus, options = {}) {
  if (!orderId) throw new Error('orderId is required');
  assertStatus(nextStatus, 'nextStatus');

  // PATCH /v1/printstore/orders/:id — the backend appends the
  // tracking row itself on status change (same as the DB trigger).
  let fromStatus = options.fromStatus;
  if (!fromStatus) {
    const detail = await apiFetch(`/v1/printstore/orders/${encodeURIComponent(orderId)}`);
    if (!detail?.order) throw new Error('Order not found');
    fromStatus = detail.order.status;
  }
  if (!options.skipTransitionCheck && !canTransitionLabStatus(fromStatus, nextStatus)) {
    throw new Error(
      `Cannot move order from "${getLabStatusLabel(fromStatus)}" to "${getLabStatusLabel(nextStatus)}"`
    );
  }
  if (fromStatus === nextStatus) {
    const detail = await apiFetch(`/v1/printstore/orders/${encodeURIComponent(orderId)}`);
    return { order: normalizeLabOrderRow(detail?.order) };
  }
  const data = await apiFetch(`/v1/printstore/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    body: { status: nextStatus },
  });
  return { order: normalizeLabOrderRow(data?.order) };
}

/**
 * Load order + items + tracking from DB (lab job ticket data).
 * @param {string} orderId
 */
export async function fetchLabOrderTicket(orderId) {
  if (!orderId) throw new Error('orderId is required');

  // GET /v1/printstore/orders/:id → { order, items, tracking }
  const data = await apiFetch(`/v1/printstore/orders/${encodeURIComponent(orderId)}`);
  if (!data?.order) throw new Error('Order not found');
  return {
    order: normalizeLabOrderRow(data.order),
    items: (data.items || []).map(normalizeLabItemRow),
    tracking: data.tracking || [],
  };
}
