import "server-only";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { industries, productCategories } from "@/db/schema";

export type AdminCategoryRow = typeof productCategories.$inferSelect;
export type AdminCategoryNode = AdminCategoryRow & { children: AdminCategoryNode[] };

export async function adminCategoryTree(): Promise<{ tree: AdminCategoryNode[]; flat: AdminCategoryRow[]; industries: Array<{ id: string; name: string; nameVi: string }> }> {
  const [rows, inds] = await Promise.all([
    db.select().from(productCategories).orderBy(asc(productCategories.level), asc(productCategories.sortOrder), asc(productCategories.name)),
    db.select({ id: industries.id, name: industries.name, nameVi: industries.nameVi }).from(industries).orderBy(asc(industries.sortOrder)),
  ]);
  const byId = new Map<string, AdminCategoryNode>();
  for (const r of rows) byId.set(r.id, { ...r, children: [] });
  const tree: AdminCategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else tree.push(node);
  }
  return { tree, flat: rows, industries: inds };
}
