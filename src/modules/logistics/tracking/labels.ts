import "server-only";
import { getTranslations } from "next-intl/server";
import { SHIPMENT_STATUSES } from "./statuses";

/** tracking.status.* for every status (stepper / badges on server pages). */
export async function shipmentStatusLabels(): Promise<Record<string, string>> {
  const t = await getTranslations("tracking");
  return Object.fromEntries(SHIPMENT_STATUSES.map((s) => [s, t(`status.${s}`)]));
}
