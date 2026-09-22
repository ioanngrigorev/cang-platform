"use client";

import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = { id: number; title: string; description?: string; variant?: "success" | "error" | "info" | "warning" };
type Ctx = { toast: (t: Omit<Toast, "id">) => void };
const ToastContext = React.createContext<Ctx>({ toast: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
  }, []);
  const icons = { success: CheckCircle2, error: XCircle, info: Info, warning: TriangleAlert };
  const colors = { success: "text-success-600", error: "text-danger-600", info: "text-info-600", warning: "text-warning-600" };
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.variant ?? "info"];
          return (
            <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-md border border-steel-200 bg-white p-3 shadow-panel animate-slide-up">
              <Icon className={cn("mt-0.5 size-5 shrink-0", colors[t.variant ?? "info"])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{t.title}</p>
                {t.description ? <p className="mt-0.5 text-xs text-steel-600">{t.description}</p> : null}
              </div>
              <button type="button" className="text-steel-400 hover:text-ink-900" onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
