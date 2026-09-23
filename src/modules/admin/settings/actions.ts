"use server";

import { formDataToObject, ok, runAction, type ActionResult } from "@/lib/action";
import { SETTING_DEFAULTS, getAllSettings, setSetting, type SettingKey } from "@/modules/settings/service";
import { adminActor, revalidateAdmin } from "../context";

/**
 * Save every changed key from the settings form. Values are coerced to the type of the default
 * (boolean → checkbox, number → number, object → JSON textarea, string → input).
 */
export async function saveSettingsAction(_prev: ActionResult<{ changed: string[] }> | null, formData: FormData): Promise<ActionResult<{ changed: string[] }>> {
  return runAction(async () => {
    const { log } = await adminActor("admin.settings.write");
    const raw = formDataToObject(formData);
    const current = await getAllSettings();
    const changed: string[] = [];
    const errors: Record<string, string[]> = {};
    for (const s of current) {
      const key = s.key as SettingKey;
      const def = SETTING_DEFAULTS[key] as unknown;
      let next: unknown;
      if (typeof def === "boolean") next = raw[key] === "on" || raw[key] === "true";
      else if (typeof def === "number") {
        if (!(key in raw)) continue;
        const n = Number(raw[key]);
        if (!Number.isFinite(n)) {
          errors[key] = ["Enter a number"];
          continue;
        }
        next = n;
      } else if (def && typeof def === "object") {
        if (!(key in raw)) continue;
        try {
          next = JSON.parse(String(raw[key] ?? ""));
        } catch {
          errors[key] = ["Enter valid JSON"];
          continue;
        }
      } else {
        if (!(key in raw)) continue;
        // Keep the raw string: some defaults intentionally start with whitespace (e.g. the SEO title suffix).
        next = String(raw[key] ?? "");
      }
      if (JSON.stringify(next) === JSON.stringify(s.value)) continue;
      await setSetting(key, next);
      await log({ action: "admin.settings.update", entityType: "setting", entityId: key, before: { value: s.value }, after: { value: next } });
      changed.push(key);
    }
    if (Object.keys(errors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errors, code: "VALIDATION" };
    revalidateAdmin("/admin/settings");
    return ok({ changed }, changed.length ? `${changed.length} setting(s) saved.` : "No changes.");
  });
}
