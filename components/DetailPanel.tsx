import React, { useSyncExternalStore, type ReactNode } from "react";
import ModalPortal from "./ModalPortal";
import { useAccessibleModal } from "../hooks/useAccessibleModal";

const query = "(max-width: 1023px)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const isCompact = () => window.matchMedia(query).matches;

/** Inline details when the workspace has room; an accessible dialog otherwise. */
export default function DetailPanel({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const compact = useSyncExternalStore(subscribe, isCompact, () => false);
  const modalRef = useAccessibleModal(compact, onClose, true, 190);
  const content = <div ref={modalRef} role={compact ? "dialog" : "complementary"}
    aria-modal={compact ? true : undefined} aria-label={label} tabIndex={-1}
    className={`detail-panel flex min-h-0 flex-col overflow-hidden ${compact ? "h-full w-full max-w-xl" : "split-side h-full shrink-0"}`}>
    {children}
  </div>;
  return compact ? <ModalPortal><div className="modal-backdrop detail-backdrop fixed inset-0 flex items-center justify-center bg-slate-950/90" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>{content}</div></ModalPortal> : content;
}
