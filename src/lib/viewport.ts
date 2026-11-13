import { signal } from '@preact/signals';

/** True below the width at which the detail view becomes a bottom sheet. */
const query = window.matchMedia('(max-width: 859px)');
export const narrow = signal(query.matches);
query.addEventListener('change', (e) => (narrow.value = e.matches));

export const online = signal(navigator.onLine);
window.addEventListener('online', () => (online.value = true));
window.addEventListener('offline', () => (online.value = false));
