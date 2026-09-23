import type { Metadata } from "next";
import { MessagesPage, type MessagesSearchParams } from "@/components/messaging/messages-page";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function SellerMessagesPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<MessagesSearchParams> }) {
  const { locale } = await params;
  return <MessagesPage side="supplier" locale={locale} searchParams={await searchParams} />;
}
