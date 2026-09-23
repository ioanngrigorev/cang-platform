import type { Metadata } from "next";
import { NewMessagePage } from "@/components/messaging/new-message-page";
import type { NewConversationParams } from "@/modules/messaging/queries";

export const metadata: Metadata = { title: "New message", robots: { index: false } };

export default async function SellerNewMessagePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<NewConversationParams> }) {
  const { locale } = await params;
  return <NewMessagePage side="supplier" locale={locale} searchParams={await searchParams} />;
}
