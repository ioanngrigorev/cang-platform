import { Building2, MessageSquareDashed, SearchX, ShieldAlert } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Avatar, Button, EmptyState, PageHeader, VerifiedMark } from "@/components/ui";
import { Link, redirect } from "@/i18n/navigation";
import { localized } from "@/lib/utils";
import { requireCompany } from "@/modules/auth/current-user";
import { counterpartyHref, messagesBase } from "@/modules/messaging/links";
import { resolveNewConversation, type NewConversationParams } from "@/modules/messaging/queries";
import type { ConversationSide } from "@/modules/messaging/schemas";
import { NewConversationForm } from "./new-conversation-form";

/**
 * /buyer/messages/new and /seller/messages/new. The counterparty and the entity come from the query string the
 * rest of the app already uses (?supplier=slug&product=slug|&rfq=id|&order=id|&quotation=id, or for sellers
 * ?company=id&rfq=id / ?quotation=id / ?order=id). An existing open conversation about the same thing wins.
 */
export async function NewMessagePage({ side, locale, searchParams }: { side: ConversationSide; locale: string; searchParams: NewConversationParams }) {
  const { company } = await requireCompany({ permission: "messages.write" });
  const t = await getTranslations("messaging.new");
  const tc = await getTranslations("messaging.context");
  const tl = await getTranslations("messaging.list");
  const base = messagesBase(side);
  const target = await resolveNewConversation({ id: company.id, isBuyer: company.isBuyer, isSeller: company.isSeller }, side, searchParams);

  if (target.ok && target.existingConversationId) {
    redirect({ href: `${base}/${target.existingConversationId}`, locale: await getLocale() });
  }

  const crumbs = [
    { label: t("breadcrumb"), href: base },
    { label: t("title") },
  ];

  if (!target.ok) {
    const map = {
      no_target: { icon: <MessageSquareDashed />, title: t("noTargetTitle"), description: side === "buyer" ? t("noTargetDescription") : t("noTargetDescriptionSeller") },
      not_found: { icon: <SearchX />, title: t("notFoundTitle"), description: t("notFoundDescription") },
      forbidden: { icon: <ShieldAlert />, title: t("forbiddenTitle"), description: t("forbiddenDescription") },
      self: { icon: <Building2 />, title: t("selfTitle"), description: t("selfDescription") },
    }[target.reason];
    return (
      <>
        <PageHeader title={t("title")} breadcrumbs={crumbs} />
        <EmptyState
          icon={map.icon}
          title={map.title}
          description={map.description}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href={base} variant="secondary">
                {t("backToInbox")}
              </Button>
              <Button href={side === "buyer" ? "/manufacturers" : "/seller/rfqs"} variant="primary">
                {side === "buyer" ? tl("browseSuppliers") : tl("browseRfqs")}
              </Button>
            </div>
          }
        />
      </>
    );
  }

  const name = localized(target.counterparty as unknown as Record<string, unknown>, "name", locale);
  const profileHref = counterpartyHref(target.counterparty);
  const refLabel = locale === "vi" && target.refLabelVi ? target.refLabelVi : target.refLabel;
  // Seeded subjects read "RFQ: …" / "Order: …"; the prefix is localized here, the product title stands alone.
  const defaultSubject = refLabel ? (target.context === "PRODUCT" || target.context === "GENERAL" ? refLabel : `${tc(target.context)}: ${refLabel}`).slice(0, 200) : null;

  return (
    <>
      <PageHeader title={t("heading", { company: name })} breadcrumbs={crumbs} className="mb-5" />
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
          <Avatar name={name} src={target.counterparty.logoUrl} size={44} square />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-steel-500">{t("to")}</p>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
              {profileHref ? (
                <Link href={profileHref} className="truncate hover:underline">
                  {name}
                </Link>
              ) : (
                <span className="truncate">{name}</span>
              )}
              <VerifiedMark status={target.counterparty.verificationStatus} />
              <span className="text-xs font-normal text-steel-500">· {target.counterparty.countryCode}</span>
            </p>
            {target.context !== "GENERAL" ? (
              <p className="mt-0.5 truncate text-xs text-steel-600">
                <span className="font-medium text-steel-700">{t("about")}:</span> {tc(target.context)}
                {refLabel ? ` · ${refLabel}` : ""}
              </p>
            ) : null}
          </div>
        </div>
        <NewConversationForm
          side={side}
          counterpartyCompanyId={target.counterparty.id}
          context={target.context}
          productId={target.productId}
          rfqId={target.rfqId}
          quotationId={target.quotationId}
          orderId={target.orderId}
          defaultSubject={defaultSubject}
          cancelHref={base}
        />
      </div>
    </>
  );
}
