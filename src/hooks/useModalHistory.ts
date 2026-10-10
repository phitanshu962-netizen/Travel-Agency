'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Global stack of active modal close handlers for LIFO handling on popstate.
 */
interface ModalEntry {
  key: string;
  onClose: () => void;
}

let modalStack: ModalEntry[] = [];
let isProgrammaticBack = false;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (e) => {
    if (isProgrammaticBack) {
      isProgrammaticBack = false;
      return;
    }

    if (modalStack.length > 0) {
      const topModal = modalStack.pop();
      if (topModal) {
        topModal.onClose();
      }
    }
  });
}

/**
 * useModalBackHandler
 * 
 * Synchronizes modal/drawer/in-app view open state with the browser history stack.
 * When `isOpen` is true:
 * - Pushes a history state entry.
 * - When user hits Android hardware Back or browser Back, calls `onClose` instead of leaving the page.
 * - When closed programmatically (e.g., clicking "X" or backdrop), cleans up history entry cleanly.
 */
export function useModalBackHandler(
  isOpen: boolean,
  onClose: () => void,
  modalKey: string
) {
  const isPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      // Push history state if not already pushed for this modal
      if (!isPushedRef.current) {
        window.history.pushState(
          { tripdm_modal: modalKey, timestamp: Date.now() },
          '',
          window.location.href
        );
        isPushedRef.current = true;

        modalStack.push({
          key: modalKey,
          onClose: () => {
            isPushedRef.current = false;
            onCloseRef.current();
          },
        });
      }
    } else {
      // Closed programmatically
      if (isPushedRef.current) {
        isPushedRef.current = false;

        // Remove from stack
        const index = modalStack.findIndex((m) => m.key === modalKey);
        if (index !== -1) {
          modalStack.splice(index, 1);
        }

        // If this modal's state is at the top of history, pop it silently
        isProgrammaticBack = true;
        window.history.back();
      }
    }

    return () => {
      // Cleanup on unmount if component unmounted while modal was open
      if (isPushedRef.current) {
        isPushedRef.current = false;
        const index = modalStack.findIndex((m) => m.key === modalKey);
        if (index !== -1) {
          modalStack.splice(index, 1);
        }
        isProgrammaticBack = true;
        window.history.back();
      }
    };
  }, [isOpen, modalKey]);
}
