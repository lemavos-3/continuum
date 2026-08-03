import { useCallback, useRef } from "react";

type Options = {
  onLongPress: () => void;
  onClick?: () => void;
  ms?: number;
  moveTolerance?: number;
};

/**
 * Cross-input long-press handler. Distinguishes a hold (>= ms) from a tap/click.
 * Returns props to spread on a button/div (touch + pointer + mouse).
 */
export function useLongPress({ onLongPress, onClick, ms = 500, moveTolerance = 10 }: Options) {
  const timer = useRef<number | null>(null);
  const triggered = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const isInteractiveTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return !!target.closest(
      'button, [role="button"], [role="link"], a[href], input, textarea, select, summary, [contenteditable="true"]',
    );
  }, []);

  const begin = useCallback(
    (e: React.PointerEvent) => {
      if (isInteractiveTarget(e.target)) {
        return;
      }

      triggered.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = window.setTimeout(() => {
        triggered.current = true;
        onLongPress();
      }, ms);
    },
    [ms, onLongPress, clear, isInteractiveTarget],
  );

  return {
    onPointerDown: begin,
    onPointerMove: (e: React.PointerEvent) => move(e.clientX, e.clientY),
    onPointerUp: (e: React.PointerEvent) => end(e),
    onPointerLeave: () => clear(),
    onPointerCancel: () => clear(),
    onContextMenu: (e: React.MouseEvent) => {
      // Suppress the native context menu when we've already triggered on touch.
      if (triggered.current) e.preventDefault();
    },
  };

  const move = useCallback(
    (x: number, y: number) => {
      if (!start.current) return;
      if (
        Math.abs(x - start.current.x) > moveTolerance ||
        Math.abs(y - start.current.y) > moveTolerance
      ) {
        clear();
      }
    },
    [moveTolerance, clear],
  );

  const end = useCallback(
    (e?: React.SyntheticEvent) => {
      clear();
      if (triggered.current) {
        e?.preventDefault();
        e?.stopPropagation();
        triggered.current = false;
        return;
      }
      onClick?.();
    },
    [onClick, clear],
  );

  return {
    onPointerDown: (e: React.PointerEvent) => begin(e.clientX, e.clientY),
    onPointerMove: (e: React.PointerEvent) => move(e.clientX, e.clientY),
    onPointerUp: (e: React.PointerEvent) => end(e),
    onPointerLeave: () => clear(),
    onPointerCancel: () => clear(),
    onContextMenu: (e: React.MouseEvent) => {
      // Suppress the native context menu when we've already triggered on touch.
      if (triggered.current) e.preventDefault();
    },
  };
}
