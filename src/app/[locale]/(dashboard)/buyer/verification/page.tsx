import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** Old notification links pointed here; verification lives under Company. */
export default async function LegacyVerificationRedirect() {
  redirect({ href: "/buyer/company/verification", locale: await getLocale() });
}
