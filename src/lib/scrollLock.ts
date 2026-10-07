// The mobile nav drawer and the blocking loaders each lock page scroll, and
// their lifetimes overlap (e.g. "Exit" from the drawer shows the sign-out
// loader). Each used to save and restore body.style.overflow on its own, so
// when they unmounted in a different order than they mounted, the last
// restore put "hidden" back and no page scrolled until a full reload.
// A shared count releases the lock only when the last holder lets go.
let holders = 0;
let savedOverflow = '';

/** Locks page scroll and returns the function that releases this hold. */
export function lockBodyScroll() {
  if (holders === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  holders += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders -= 1;
    if (holders === 0) document.body.style.overflow = savedOverflow;
  };
}
