/**
 * Soft-launch guard: block Add to cart and show a polite beta notice.
 * Flip to `false` (or delete the intercept call sites) when Print Store ordering goes live.
 * Does not auto-expire — remove manually after 21 November (or whenever ready).
 */
export const PRINTSTORE_CART_BETA_INTERCEPT = true;

export const PRINTSTORE_CART_BETA_READY_DATE_LABEL = '21 November';

export const PRINTSTORE_CART_BETA_COPY = {
  title: 'Print Store is in beta',
  body: `Thanks for exploring. Ordering isn’t open yet — this feature will be ready on ${PRINTSTORE_CART_BETA_READY_DATE_LABEL}. You’re welcome to keep browsing products in the meantime.`,
  button: 'Got it',
};

export function shouldInterceptPrintstoreCart() {
  return PRINTSTORE_CART_BETA_INTERCEPT === true;
}
