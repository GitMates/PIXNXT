import { describe, expect, it } from 'vitest';
import {
  PRINTSTORE_CART_BETA_COPY,
  PRINTSTORE_CART_BETA_INTERCEPT,
  PRINTSTORE_CART_BETA_READY_DATE_LABEL,
  shouldInterceptPrintstoreCart,
} from './printstoreCartBeta';

describe('printstoreCartBeta', () => {
  it('intercepts cart adds while the soft-launch flag is on', () => {
    expect(PRINTSTORE_CART_BETA_INTERCEPT).toBe(true);
    expect(shouldInterceptPrintstoreCart()).toBe(true);
  });

  it('mentions the November ready date in the polite copy', () => {
    expect(PRINTSTORE_CART_BETA_READY_DATE_LABEL).toBe('21 November');
    expect(PRINTSTORE_CART_BETA_COPY.title).toMatch(/beta/i);
    expect(PRINTSTORE_CART_BETA_COPY.body).toContain('21 November');
    expect(PRINTSTORE_CART_BETA_COPY.button).toBe('Got it');
  });
});
