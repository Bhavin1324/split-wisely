import { useState, useRef, useEffect, useCallback } from 'react';

interface UseBottomSheetDismissProps {
  open: boolean;
  onClose: () => void;
  threshold?: number;
  maxDragForFullFade?: number;
  dismissDurationMs?: number;
}

export function useBottomSheetDismiss({
  open,
  onClose,
  threshold = 90,
  maxDragForFullFade = 300,
  dismissDurationMs = 220,
}: UseBottomSheetDismissProps) {
  const [isRendered, setIsRendered] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const currentDragY = useRef(0);
  const isDragging = useRef(false);

  // Sync open state with presence
  useEffect(() => {
    if (open) {
      setIsRendered(true);
      setIsClosing(false);
      currentDragY.current = 0;
    } else if (!isClosing) {
      setIsRendered(false);
    }
  }, [open, isClosing]);

  const triggerDismiss = useCallback(
    (onComplete?: () => void) => {
      if (isClosing) return;
      setIsClosing(true);

      if (sheetRef.current) {
        sheetRef.current.classList.remove('animate-sheet-slide-up');
        sheetRef.current.style.transition = `transform ${dismissDurationMs}ms cubic-bezier(0.32, 0.72, 0, 1)`;
        sheetRef.current.style.transform = 'translate3d(0, 100%, 0)';
      }
      if (backdropRef.current) {
        backdropRef.current.classList.remove('animate-backdrop-fade-in');
        backdropRef.current.style.transition = `opacity ${dismissDurationMs}ms cubic-bezier(0.32, 0.72, 0, 1)`;
        backdropRef.current.style.opacity = '0';
      }

      setTimeout(() => {
        setIsClosing(false);
        setIsRendered(false);
        currentDragY.current = 0;

        if (sheetRef.current) {
          sheetRef.current.style.transform = '';
          sheetRef.current.style.transition = '';
        }
        if (backdropRef.current) {
          backdropRef.current.style.opacity = '';
          backdropRef.current.style.transition = '';
        }

        if (onComplete) {
          onComplete();
        } else {
          onClose();
        }
      }, dismissDurationMs);
    },
    [isClosing, dismissDurationMs, onClose],
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    touchStartY.current = e.clientY;
    isDragging.current = true;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported in test environment
    }

    if (sheetRef.current) {
      sheetRef.current.classList.remove('animate-sheet-slide-up');
      sheetRef.current.style.transition = 'none';
    }
    if (backdropRef.current) {
      backdropRef.current.classList.remove('animate-backdrop-fade-in');
      backdropRef.current.style.transition = 'none';
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      const deltaY = e.clientY - touchStartY.current;

      if (deltaY > 0) {
        // 1:1 finger / cursor tracking downward
        currentDragY.current = deltaY;
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translate3d(0, ${deltaY}px, 0)`;
        }
        if (backdropRef.current) {
          const opacity = Math.max(0, 1 - deltaY / maxDragForFullFade);
          backdropRef.current.style.opacity = `${opacity}`;
        }
      } else {
        // Rubber-band resistance upward
        currentDragY.current = deltaY * 0.2;
        if (sheetRef.current) {
          sheetRef.current.style.transform = `translate3d(0, ${currentDragY.current}px, 0)`;
        }
      }
    },
    [maxDragForFullFade],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;

      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is already released
      }

      if (currentDragY.current >= threshold) {
        triggerDismiss();
      } else {
        // Snap back to resting top position
        if (sheetRef.current) {
          sheetRef.current.style.transition = 'transform 200ms cubic-bezier(0.2, 0.9, 0.3, 1)';
          sheetRef.current.style.transform = 'translate3d(0, 0, 0)';
        }
        if (backdropRef.current) {
          backdropRef.current.style.transition = 'opacity 200ms cubic-bezier(0.2, 0.9, 0.3, 1)';
          backdropRef.current.style.opacity = '1';
        }
        currentDragY.current = 0;
      }
    },
    [threshold, triggerDismiss],
  );

  return {
    isRendered,
    isClosing,
    sheetRef,
    backdropRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    triggerDismiss,
  };
}
