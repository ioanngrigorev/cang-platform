"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { ok, parseInput, runAction, type ActionResult } from "@/lib/action";
import { audit } from "@/modules/audit/log";
import { requireAuth } from "@/modules/auth/current-user";
import { setActiveCompany } from "@/modules/auth/session";
import { createCompanyForUser, enableCapability } from "@/modules/companies/service";

const schema = z.object({
  companyName: z.string().trim().min(2, "Enter your company name").max(200),
  countryCode: z.string().trim().length(2).toUpperCase(),
  accountType: z.enum(["BUYER", "SELLER"]),
});

export async function onboardingAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireAuth();
    const parsed = parseInput(schema, Object.fromEntries(formData));
    if (!parsed.success) return parsed.result;
    const company = await createCompanyForUser({ name: parsed.data.companyName, countryCode: parsed.data.countryCode, accountType: parsed.data.accountType, ownerUserId: auth.user.id });
    await setActiveCompany(auth.sessionId, company.id);
    await audit({ actorId: auth.user.id, action: "company.create", entityType: "company", entityId: company.id, after: { accountType: parsed.data.accountType } });
    const locale = await getLocale();
    redirect({ href: parsed.data.accountType === "SELLER" ? "/seller?welcome=1" : "/buyer?welcome=1", locale });
    return ok(undefined);
  });
}

export async function enableCapabilityAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const auth = await requireAuth();
    const capability = formData.get("capability") === "SELLER" ? "SELLER" : "BUYER";
    const m = auth.activeMembership;
    if (!m) throw new Error("No active company");
    if (m.role !== "OWNER" && m.role !== "ADMIN") return { ok: false, error: "Only company owners or admins can enable new workspaces." };
    await enableCapability(m.companyId, capability);
    await audit({ actorId: auth.user.id, action: "company.enableCapability", entityType: "company", entityId: m.companyId, after: { capability } });
    const locale = await getLocale();
    redirect({ href: capability === "SELLER" ? "/seller" : "/buyer", locale });
    return ok(undefined);
  });
}
