import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Blocks copy / cut / paste / right-click / drag-to-copy WITHIN a single
 * container element (scoped by ref) — NOT on the whole document. Attach it to
 * the problem prompt, schema panel and expected-output panel so students can't
 * copy those out, while leaving the SQL editor fully interactive.
 *
 * Reusable: pass any element ref. Pass `enabled: false` to turn it off.
 */
export function useCopyProtection(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean = true
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const events: (keyof HTMLElementEventMap)[] = [
      'copy',
      'cut',
      'paste',
      'contextmenu',
      'dragstart',
    ];

    events.forEach((ev) => el.addEventListener(ev, block as EventListener));

    return () => {
      events.forEach((ev) => el.removeEventListener(ev, block as EventListener));
    };
  }, [ref, enabled]);
}
