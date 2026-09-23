import { Boxes, FileText, Package, Receipt, ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type * as React from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { contextHref, contextLabel, type ContextRef } from "@/modules/messaging/links";
import type { ConversationContext, ConversationSide } from "@/modules/messaging/schemas";

const ICONS: Record<ConversationContext, React.ComponentType<{ className?: string }> | null> = {
  GENERAL: null,
  PRODUCT: Boxes,
  RFQ: FileText,
  QUOTATION: Receipt,
  ORDER: Package,
  DISPUTE: ShieldAlert,
};

/** Small chip naming what a conversation is about; links to the entity page for the viewing side when it has one. */
export async function ContextChip({ context, entity, side, locale, size = "md", className, linked = true }: { context: ConversationContext; entity: ContextRef; side: ConversationSide; locale: string; size?: "sm" | "md"; className?: string; /** false inside another link (nested anchors are invalid HTML) */ linked?: boolean }) {
  const tc = await getTranslations("messaging.context");
  const type = entity?.type ?? context;
  if (type === "GENERAL") return null;
  const Icon = ICONS[type];
  const label = contextLabel(entity, locale);
  const href = linked ? contextHref(entity, side) : null;
  const classes = cn(
    "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border border-hairline bg-surface text-steel-700",
    size === "sm" ? "px-1.5 py-0 text-[11px]" : "px-2.5 py-0.5 text-xs",
    href && "hover:border-brand-300 hover:text-brand-700",
    className,
  );
  const inner = (
    <>
      {Icon ? <Icon className={cn("shrink-0 text-steel-500", size === "sm" ? "size-3" : "size-3.5")} /> : null}
      <span className="shrink-0 font-medium">{tc(type)}</span>
      {label ? <span className="truncate text-steel-500">· {label}</span> : null}
    </>
  );
  return href ? (
    <Link href={href} className={classes} title={label ?? undefined}>
      {inner}
    </Link>
  ) : (
    <span className={classes} title={label ?? undefined}>
      {inner}
    </span>
  );
}
