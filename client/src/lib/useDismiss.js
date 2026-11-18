import { useCallback, useEffect } from 'react';

// For <details> dropdown menus: closes the menu when you click anywhere
// outside it or press Escape. Returns a close() function for menu items.
export function useDismiss(ref) {
  const close = useCallback(() => {
    if (ref.current) ref.current.open = false;
  }, [ref]);

  useEffect(() => {
    const onPointerDown = (e) => { if (ref.current && !ref.current.contains(e.target)) close(); };
    const onKeyDown = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, close]);

  return close;
}
