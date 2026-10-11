import { useEffect, useRef, useId } from "react";

const modalStack: { id: string; layer: number; ref: { current: HTMLDivElement | null } }[] = [];
let originalOverflow = "";

const FOCUSABLE = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Gives legacy operational modals the keyboard and focus behavior expected of
 * a production dialog without coupling that behavior to their visual design.
 */
export function useAccessibleModal(
  isOpen: boolean,
  onClose: () => void,
  canClose = true,
  layer = 200,
) {
  const modalId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const canCloseRef = useRef(canClose);
  closeRef.current = onClose;
  canCloseRef.current = canClose;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (!modalStack.length) originalOverflow = document.body.style.overflow;
    modalStack.push({ id: modalId, layer, ref: modalRef });
    modalStack.sort((a, b) => a.layer - b.layer);
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const modal = modalRef.current;
      if (!modal || modalStack.at(-1)?.id !== modalId) return;
      const preferred = modal.querySelector<HTMLElement>(
        "[data-modal-cancel], [data-modal-close]",
      );
      const first = modal.querySelector<HTMLElement>(FOCUSABLE);
      (preferred ?? first ?? modal).focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      const modal = modalRef.current;
      if (!modal || modalStack.at(-1)?.id !== modalId) return;

      if (event.key === "Escape" && canCloseRef.current) {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        modal.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      const position = modalStack.findIndex(entry => entry.id === modalId);
      const wasTop = position === modalStack.length - 1;
      if (position >= 0) modalStack.splice(position, 1);
      if (!modalStack.length) document.body.style.overflow = originalOverflow;
      if (wasTop) {
        if (previouslyFocused?.isConnected) previouslyFocused.focus();
        else modalStack.at(-1)?.ref.current?.focus();
      }
    };
  }, [isOpen, modalId, layer]);

  return modalRef;
}
