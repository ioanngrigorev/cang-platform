"use client";

import { Check, Share2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";

/** Uses the Web Share API when available, otherwise copies the URL to the clipboard. */
export function ShareButton({ title, label, copiedLabel, size = "md", className }: { title: string; label: string; copiedLabel: string; size?: "sm" | "md"; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user cancelled */
    }
  };
  return (
    <Button type="button" variant="ghost" size={size} onClick={share} className={className} aria-live="polite">
      {copied ? <Check /> : <Share2 />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
