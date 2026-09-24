import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClasses =
  "flex h-10 w-full rounded-md border border-steel-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-steel-400 shadow-sm transition-colors focus:border-ink-500 focus:outline-none focus:ring-2 focus:ring-ink-100 disabled:cursor-not-allowed disabled:bg-steel-50 disabled:opacity-70 aria-[invalid=true]:border-danger-500 aria-[invalid=true]:ring-danger-100";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(inputClasses, className)} {...props} />;
});

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, invalid, ...props }, ref) {
  return <textarea ref={ref} aria-invalid={invalid || undefined} className={cn(inputClasses, "min-h-[96px] h-auto resize-y leading-relaxed", className)} {...props} />;
});

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, invalid, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(inputClasses, "appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 20 20%22%3E%3Cpath stroke=%22%235f6b7c%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22 stroke-width=%221.5%22 d=%22M6 8l4 4 4-4%22/%3E%3C/svg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-9", className)}
      {...props}
    >
      {children}
    </select>
  );
});

export function Checkbox({ className, label, description, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode; description?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm", className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-steel-300 text-ink-900 focus:ring-brass-400" {...props} />
      {label || description ? (
        <span className="space-y-0.5">
          {label ? <span className="font-medium text-ink-900">{label}</span> : null}
          {description ? <span className="block text-xs text-steel-500">{description}</span> : null}
        </span>
      ) : null}
    </label>
  );
}

export function Label({ className, children, required, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("block text-sm font-medium text-ink-900", className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-danger-600">*</span> : null}
    </label>
  );
}

/** Label + control + hint/error. Pass `error` from ActionResult.fieldErrors[name]?.[0]. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | string[] | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const err = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {err ? (
        <p className="text-xs text-danger-600" role="alert" data-action-error="">
          {err}
        </p>
      ) : hint ? (
        <p className="text-xs text-steel-500">{hint}</p>
      ) : null}
    </div>
  );
}
