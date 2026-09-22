"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible modal built on the native <dialog> element — no runtime dependency.
 * Usage: const [open, setOpen] = useState(false); <Dialog open={open} onClose={() => setOpen(false)} title="...">...</Dialog>
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn("w-[calc(100%-2rem)] rounded-lg border border-steel-200 bg-white p-0 shadow-panel backdrop:bg-ink-950/50 backdrop:backdrop-blur-[2px] open:animate-slide-up", width, className)}
    >
      <div className="flex items-start justify-between gap-4 border-b border-steel-100 px-5 py-4">
        <div>
          {title ? <h2 className="text-lg font-semibold text-ink-900">{title}</h2> : null}
          {description ? <p className="mt-0.5 text-sm text-steel-500">{description}</p> : null}
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-steel-500 hover:bg-steel-100 hover:text-ink-900" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      {footer ? <div className="flex items-center justify-end gap-2 border-t border-steel-100 px-5 py-3">{footer}</div> : null}
    </dialog>
  );
}

/** Lightweight dropdown menu using <details>. Closes on outside click. */
export function Dropdown({ trigger, children, align = "right", className }: { trigger: React.ReactNode; children: React.ReactNode; align?: "left" | "right"; className?: string }) {
  const ref = React.useRef<HTMLDetailsElement>(null);
  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);
  return (
    <details ref={ref} className={cn("relative", className)}>
      <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">{trigger}</summary>
      <div className={cn("absolute z-40 mt-2 min-w-[200px] rounded-md border border-steel-200 bg-white p-1 shadow-panel animate-fade-in", align === "right" ? "right-0" : "left-0")} onClick={() => (ref.current!.open = false)}>
        {children}
      </div>
    </details>
  );
}

export function DropdownItem({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn("flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-ink-900 hover:bg-steel-100 [&_svg]:size-4 [&_svg]:text-steel-500", className)} {...props} />;
}
