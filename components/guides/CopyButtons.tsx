'use client';

import { useEffect } from 'react';

// Adds a Copy button to every <pre> inside the guide (port of the package's
// guide.js). Copies only the code text; falls back to selecting it.
export function CopyButtons({ scope }: { scope: string }) {
  useEffect(() => {
    const root = document.querySelector(scope);
    if (!root) return;
    const added: HTMLButtonElement[] = [];
    root.querySelectorAll('pre').forEach((pre) => {
      if (pre.querySelector('button')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy this command or prompt');
      button.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        const text = code?.textContent ?? '';
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = 'Copied';
          setTimeout(() => (button.textContent = 'Copy'), 1800);
        } catch {
          if (code) {
            const r = document.createRange();
            r.selectNodeContents(code);
            const s = window.getSelection();
            s?.removeAllRanges();
            s?.addRange(r);
          }
          button.textContent = 'Selected — use Copy';
        }
      });
      pre.appendChild(button);
      added.push(button);
    });
    return () => added.forEach((b) => b.remove());
  }, [scope]);
  return null;
}
