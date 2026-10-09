/**
 * Helper to smoothly scroll to any element and pulse it 3 times with the Complex Theme colors.
 * After 3 pulses (~2.4s), the pulse cleanly stops.
 */
export function triggerComplexThemePulse(elementOrId: string | HTMLElement | null | undefined): void {
  if (!elementOrId) return;

  const runPulse = () => {
    let el: HTMLElement | null = null;
    if (typeof elementOrId === 'string') {
      el = document.getElementById(elementOrId) ||
           document.getElementById(`item-${elementOrId}`) ||
           document.getElementById(`student-item-${elementOrId}`) ||
           document.getElementById(`halaqah-item-${elementOrId}`) ||
           document.getElementById(`library-item-${elementOrId}`) ||
           document.getElementById(`cert-item-${elementOrId}`) ||
           document.getElementById(`violation-item-${elementOrId}`) ||
           document.getElementById(`teacher-att-item-${elementOrId}`) ||
           document.getElementById(`account-item-${elementOrId}`) ||
           (document.querySelector(`[data-item-id="${elementOrId}"]`) as HTMLElement) ||
           (document.querySelector(elementOrId) as HTMLElement);
    } else {
      el = elementOrId;
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('complex-theme-pulse-3');
      // Force reflow
      void el.offsetWidth;
      el.classList.add('complex-theme-pulse-3');

      // Stop pulsing after 3 iterations (0.8s * 3 = 2.4s)
      setTimeout(() => {
        el?.classList.remove('complex-theme-pulse-3');
      }, 2600);
    }
  };

  // Run with slight delay for render stability
  setTimeout(runPulse, 120);
  setTimeout(runPulse, 380);
}

/**
 * Global dispatch for highlighting an item across components
 */
export function dispatchHighlightItem(id: string, type?: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('omran-highlight-item', {
        detail: { id, type, timestamp: Date.now() },
      })
    );
    triggerComplexThemePulse(id);
  }
}
