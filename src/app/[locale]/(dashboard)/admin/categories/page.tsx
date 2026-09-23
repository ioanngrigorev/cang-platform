import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CategoryDialog, CategoryToggle, type CategoryOption } from "@/components/admin/category-forms";
import { Badge, Card, CardContent, PageHeader } from "@/components/ui";
import { localized } from "@/lib/utils";
import { adminCategoryTree, type AdminCategoryNode } from "@/modules/admin/categories/queries";
import { canPlatform, requireAdmin } from "@/modules/auth/current-user";

export const metadata: Metadata = { title: "Categories", robots: { index: false } };

export default async function AdminCategoriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const auth = await requireAdmin("admin.categories.write");
  const t = await getTranslations("admin.categories");
  const tc = await getTranslations("admin.common");
  const { tree, flat, industries } = await adminCategoryTree();
  const canWrite = canPlatform(auth, "admin.categories.write");
  const parents: CategoryOption[] = flat.map((c) => ({ id: c.id, name: localized(c, "name", locale), level: c.level, path: c.path, slug: c.slug }));
  const industryOptions = industries.map((i) => ({ id: i.id, name: localized(i, "name", locale) }));
  const activeCount = flat.filter((c) => c.isActive).length;

  const renderNode = (node: AdminCategoryNode) => (
    <li key={node.id}>
      <div className={`flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-steel-50 ${node.isActive ? "" : "opacity-60"}`} style={{ paddingLeft: `${12 + node.level * 24}px` }}>
        <span className="font-medium text-ink-900">{localized(node, "name", locale)}</span>
        <span className="text-xs text-steel-500">{locale === "vi" ? node.name : node.nameVi}</span>
        <code className="rounded bg-steel-100 px-1 py-0.5 text-[11px] text-steel-600">
          /{node.path}
          {node.slug}
        </code>
        <span className="text-xs text-steel-500">{t("productCount", { count: node.productCount })}</span>
        {node.isFeatured ? <Badge size="sm" variant="brass">{t("featured")}</Badge> : null}
        {!node.isActive ? <Badge size="sm">{tc("inactive")}</Badge> : null}
        {canWrite ? (
          <span className="ml-auto flex items-center gap-1">
            <CategoryDialog
              values={{ id: node.id, name: node.name, nameVi: node.nameVi, slug: node.slug, parentId: node.parentId, industryId: node.industryId, description: node.description, descriptionVi: node.descriptionVi, icon: node.icon, sortOrder: node.sortOrder, isActive: node.isActive, isFeatured: node.isFeatured }}
              parents={parents}
              industries={industryOptions}
              compact
            />
            {node.level < 2 ? <CategoryDialog parents={parents} industries={industryOptions} defaultParentId={node.id} compact /> : null}
            <CategoryToggle categoryId={node.id} isActive={node.isActive} />
          </span>
        ) : null}
      </div>
      {node.children.length ? <ul>{node.children.map(renderNode)}</ul> : null}
    </li>
  );

  return (
    <div className="max-w-none">
      <PageHeader title={t("title")} description={t("description", { total: flat.length, active: activeCount })} actions={canWrite ? <CategoryDialog parents={parents} industries={industryOptions} /> : null} />
      <Card>
        <CardContent className="p-2">
          <ul>{tree.map(renderNode)}</ul>
        </CardContent>
      </Card>
    </div>
  );
}
