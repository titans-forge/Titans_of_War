import { useEffect, useRef } from 'react';

export function useDialogFocus(ref, open, onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const panel = ref.current;
    if (!open || !panel) return undefined;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const siblings = [];
    let branch = panel;
    while (branch.parentElement && branch !== document.body) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch) {
          siblings.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    document.body.style.overflow = 'hidden';
    const focusable = () => [...panel.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex="0"]')]
      .filter((node) => !node.disabled && node.getClientRects().length > 0);
    const candidates = focusable();
    (candidates.find(node => node.hasAttribute('data-dialog-initial-focus')) || candidates[0] || panel).focus({ preventScroll: true });
    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close.current?.();
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      const first = nodes[0] || panel;
      const last = nodes.at(-1) || panel;
      if (!panel.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.body.style.overflow = overflow;
      for (const [node, inert] of siblings) node.inert = inert;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, ref]);
}
