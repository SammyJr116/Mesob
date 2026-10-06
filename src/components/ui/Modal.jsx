import React, { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

/**
 * One dialog for the whole app: backdrop dismissal, Escape, focus trap with
 * restore, scroll lock, and a heading level that does not skip h2.
 *
 * Pass `onSubmit` when the dialog collects input. Modal then renders a real
 * `<form>` around the body and footer, so Enter submits and the footer button
 * only needs `type="submit"`.
 *
 * @param {{ title: string, description?: string, onClose: () => void, onSubmit?: (e: import("react").FormEvent) => void, children?: import("react").ReactNode, footer?: import("react").ReactNode, size?: keyof typeof WIDTHS, bare?: boolean }} props
 */
export default function Modal({ title, description, onClose, onSubmit, children, footer, size = "md", bare = false }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  const restoreRef = useRef(null);

  useEffect(() => {
    restoreRef.current = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null);
      if (nodes.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === firstNode || document.activeElement === panel)) {
        e.preventDefault();
        lastNode.focus();
      } else if (!e.shiftKey && document.activeElement === lastNode) {
        e.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [onClose]);

  const onBackdrop = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  /* With no submit handler the body stays bare; with one it becomes a real
     form so Enter submits and validation semantics are the browser's. The
     footer has to sit inside that same form, otherwise its `type="submit"`
     button has no form owner and silently does nothing. */
  const body = (
    <>
      {children}
      {footer && <div className="mt-4 flex flex-wrap justify-end gap-2">{footer}</div>}
      {!bare && !footer && <div className="mt-4" />}
    </>
  );

  const content = onSubmit ? (
    <form onSubmit={onSubmit} noValidate>
      {body}
    </form>
  ) : (
    body
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onBackdrop}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-card p-5 shadow-xl outline-none",
          WIDTHS[size]
        )}
      >
        {title && (
          <div className="mb-4 flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-lg font-semibold">{title}</h2>
              {description && (
                <p id={descId} className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <button type="button" onClick={onClose} aria-label="Close dialog" className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {content}
      </div>
    </div>
  );
}