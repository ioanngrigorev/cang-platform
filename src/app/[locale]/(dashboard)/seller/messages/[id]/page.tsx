import type { Metadata } from "next";
import { MessagesPage, type MessagesSearchParams } from "@/components/messaging/messages-page";

export const metadata: Metadata = { title: "Conversation", robots: { index: false } };

export default async function SellerConversationPage({ params, searchParams }: { params: Promise<{ locale: string; id: string }>; searchParams: Promise<MessagesSearchParams> }) {
  const { locale, id } = await params;
  return <MessagesPage side="supplier" locale={locale} searchParams={await searchParams} selectedId={id} />;
}
