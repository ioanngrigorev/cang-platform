"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

/** Opens the browser print dialog — the printable layout is handled by the `print:` Tailwind variants. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="print:hidden">
      <Printer /> {label}
    </Button>
  );
}
