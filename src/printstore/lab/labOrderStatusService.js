import { supabase } from '../../lib/supabase/client';
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
 * @param {string} orderId
 * @param {string} nextStatus
 * @param {{ fromStatus?: string, skipTransitionCheck?: boolean }} [options]
 * @returns {Promise<{ order: object }>}
 */
export async function transitionLabOrderStatus(orderId, nextStatus, options = {}) {
  if (!orderId) throw new Error('orderId is required');
  assertStatus(nextStatus, 'nextStatus');

  const { data: current, error: fetchError } = await supabase
    .from('printstore_orders')
    .select('id, status')
    .eq('id', orderId)
    .single();

  if (fetchError) throw fetchError;
  if (!current) throw new Error('Order not found');

  const fromStatus = options.fromStatus || current.status;

  if (!options.skipTransitionCheck && !canTransitionLabStatus(fromStatus, nextStatus)) {
    throw new Error(
      `Cannot move order from "${getLabStatusLabel(fromStatus)}" to "${getLabStatusLabel(nextStatus)}"`
    );
  }

  if (fromStatus === nextStatus) {
    const { data: order, error } = await supabase
      .from('printstore_orders')
      .select('*')
      .eq('id', orderId)
      .single();
    if (error) throw error;
    return { order };
  }

  const { data: order, error: updateError } = await supabase
    .from('printstore_orders')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*')
    .single();

  if (updateError) {
    // Surface DB check-constraint failures clearly (status not allowed in DB yet)
    const msg = updateError.message || String(updateError);
    if (/check constraint|printstore_orders_status_check/i.test(msg)) {
      throw new Error(
        `Database rejected status "${nextStatus}". Run lab_order_status_machine.sql in Supabase, then retry.`
      );
    }
    throw updateError;
  }

  return { order };
}

/**
 * Load order + items + tracking from DB (lab job ticket data).
 * @param {string} orderId
 */
export async function fetchLabOrderTicket(orderId) {
  if (!orderId) throw new Error('orderId is required');

  const { data: order, error: orderError } = await supabase
    .from('printstore_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  const { data: items, error: itemsError } = await supabase
    .from('printstore_order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (itemsError) throw itemsError;

  const { data: tracking, error: trackingError } = await supabase
    .from('printstore_order_tracking')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  // Tracking table may be missing on some envs — do not fail the whole ticket
  if (trackingError && trackingError.code !== '42P01' && trackingError.code !== 'PGRST205') {
    console.warn('Lab tracking load warning:', trackingError.message);
  }

  return {
    order,
    items: items || [],
    tracking: trackingError ? [] : tracking || [],
  };
}
