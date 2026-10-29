/** One held slot = one original PUT on the wire. Previews do not use these. */
export function createOriginalSlotLedger() {
  let held = 0;
  const open = new Set();
  return {
    get held() {
      return held;
    },
    has(id) {
      return open.has(id);
    },
    acquire(id) {
      if (open.has(id)) return;
      open.add(id);
      held += 1;
    },
    release(id) {
      if (!open.has(id)) return false;
      open.delete(id);
      held = Math.max(0, held - 1);
      return true;
    },
    reset() {
      held = 0;
      open.clear();
    },
  };
}
