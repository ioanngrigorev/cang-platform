import { Bell } from "lucide-react";
import type { Metadata } from "next";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { MarkAllReadButton, NotificationList } from "@/components/buyer/notification-list";
import { Card, CardContent, EmptyState, LinkTabs, PageHeader, Pagination } from "@/components/ui";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireCompany } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

const PAGE_SIZE = 25;

export default async function BuyerNotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const { user } = await requireCompany({ buyer: true });
  const t = await getTranslations("buyer.notifications");

  const tab = sp.tab === "unread" ? "unread" : "all";
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const where = tab === "unread" ? and(eq(notifications.userId, user.id), isNull(notifications.readAt)) : eq(notifications.userId, user.id);

  const [rows, [{ total }], [{ unread }]] = await Promise.all([
    db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(notifications).where(where),
    db.select({ unread: count() }).from(notifications).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} actions={unread > 0 ? <MarkAllReadButton /> : undefined} />

      <LinkTabs
        current={tab}
        className="mb-5"
        tabs={[
          { value: "all", label: t("all"), href: "/buyer/notifications?tab=all" },
          { value: "unread", label: t("unread"), href: "/buyer/notifications?tab=unread", count: unread },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState icon={<Bell />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <NotificationList
                locale={locale}
                rows={rows.map((n) => ({
                  id: n.id,
                  type: n.type,
                  title: n.title,
                  body: n.body,
                  link: n.link,
                  readAt: n.readAt ? n.readAt.toISOString() : null,
                  createdAt: n.createdAt.toISOString(),
                }))}
              />
            </CardContent>
          </Card>
          <Pagination page={page} totalPages={totalPages} hrefFor={(p) => `/buyer/notifications?tab=${tab}&page=${p}`} className="mt-6" />
        </>
      )}
    </>
  );
}
