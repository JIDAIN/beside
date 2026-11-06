"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

export type AppConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "normal" | "danger";
};

type Request = { options: AppConfirmOptions; resolve: (value: boolean) => void };
type Confirm = (options: AppConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function useAppConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useAppConfirm requires AppConfirmProvider");
  return confirm;
}

export function AppConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const pending = useRef<Request | null>(null);
  const initialFocus = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const finish = useCallback((accepted: boolean) => {
    const current = pending.current;
    if (!current) return;
    pending.current = null;
    setRequest(null);
    current.resolve(accepted);
    initialFocus.current?.focus();
    initialFocus.current = null;
  }, []);

  const confirm = useCallback<Confirm>((options) => {
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      initialFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const next = { options, resolve };
      pending.current = next;
      setRequest(next);
    });
  }, []);

  useEffect(() => {
    if (!request) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
      } else if (event.key === "Tab") {
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [request, finish]);

  useEffect(() => () => {
    pending.current?.resolve(false);
    pending.current = null;
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <div className="app-confirm-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) finish(false);
        }}>
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={request.options.description ? descriptionId : undefined}
            className="app-confirm-panel"
          >
            <div className="app-confirm-symbol" aria-hidden="true">♡</div>
            <h2 id={titleId} className="app-confirm-title">{request.options.title}</h2>
            {request.options.description && (
              <p id={descriptionId} className="app-confirm-description">{request.options.description}</p>
            )}
            <div className="app-confirm-actions">
              <button type="button" ref={cancelRef} className="app-confirm-cancel" onClick={() => finish(false)}>
                {request.options.cancelLabel || "再想想"}
              </button>
              <button
                type="button"
                ref={confirmRef}
                className={request.options.tone === "danger" ? "app-confirm-accept is-danger" : "app-confirm-accept"}
                onClick={() => finish(true)}
              >
                {request.options.confirmLabel || "确认"}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
