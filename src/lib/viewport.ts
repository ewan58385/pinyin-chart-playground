import { signal } from '@preact/signals';

/** True below the width at which the detail view becomes a bottom sheet. */
const query = window.matchMedia('(max-width: 859px)');
export const narrow = signal(query.matches);
query.addEventListener('change', (e) => (narrow.value = e.matches));

export const online = signal(navigator.onLine);
window.addEventListener('online', () => (online.value = true));
window.addEventListener('offline', () => (online.value = false));

/**
 * Keep a focused text field in view when the on-screen keyboard opens. The keyboard
 * shrinks the page; the bottom sheet's height follows the page, and the browser's own
 * scroll to the field can happen before that settles, leaving notes or a recording's
 * name under the keyboard. After each resize, a field that is focused and outside
 * the visible area is scrolled back into it.
 */
const editable = (el: Element | null): el is HTMLElement => !!el && (/^(INPUT|TEXTAREA)$/.test(el.tagName) || (el as HTMLElement).isContentEditable);
function revealFocused() {
  const el = document.activeElement;
  if (!editable(el)) return;
  const vv = window.visualViewport;
  const top = vv?.offsetTop ?? 0;
  const bottom = top + (vv?.height ?? window.innerHeight);
  const b = el.getBoundingClientRect();
  if (b.top < top || b.bottom > bottom) el.scrollIntoView({ block: 'nearest' });
}
let revealTimer: ReturnType<typeof setTimeout> | undefined;
const onResize = () => {
  clearTimeout(revealTimer);
  // Wait for the layout to follow the new size (the keyboard animates in).
  revealTimer = setTimeout(revealFocused, 120);
};
(window.visualViewport ?? window).addEventListener('resize', onResize);
