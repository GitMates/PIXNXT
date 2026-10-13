import { apiFetch } from './api/client';

function loadRazorpayScript() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay checkout')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

function openCheckout({ key, orderId, amount, currency, email, name }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      fn();
    };
    const checkout = new window.Razorpay({
      key,
      amount,
      currency,
      name: name || 'PIXNXT',
      description: 'Print store order',
      order_id: orderId,
      prefill: email ? { email } : undefined,
      handler(response) {
        finish(() => resolve(response));
      },
      modal: {
        ondismiss() {
          finish(() => reject(new Error('Payment cancelled')));
        },
      },
      theme: { color: '#111111' },
    });
    checkout.on('payment.failed', (resp) => {
      const message = resp?.error?.description || 'Payment failed';
      finish(() => reject(new Error(message)));
    });
    checkout.open();
  });
}

/**
 * Create a Razorpay order for these cart lines, open Standard Checkout,
 * and verify the signature. Resolves with the payment ids only after verify.
 */
export async function payPrintStoreOrder({ items, email, name }) {
  const created = await apiFetch('/v1/printstore/payments/orders', {
    method: 'POST',
    auth: false,
    body: {
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      })),
    },
  });
  const key = created?.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!created?.order_id || !key) {
    throw new Error('Razorpay checkout could not be started');
  }
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error('Could not load Razorpay checkout');
  const response = await openCheckout({
    key,
    orderId: created.order_id,
    amount: created.amount,
    currency: created.currency || 'INR',
    email,
    name,
  });
  const verified = await apiFetch('/v1/printstore/payments/verify', {
    method: 'POST',
    auth: false,
    body: {
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    },
  });
  if (!verified?.ok) throw new Error('Payment could not be verified');
  return {
    razorpayOrderId: response.razorpay_order_id,
    paymentId: response.razorpay_payment_id,
    amountPaise: Number(created.amount) || 0,
  };
}
