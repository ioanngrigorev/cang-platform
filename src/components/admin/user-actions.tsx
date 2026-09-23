"use client";

import { LogOut, ShieldCheck, UserCog, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { changePlatformRoleAction, forceLogoutAction, setUserStatusAction } from "@/modules/admin/users/actions";
import { PLATFORM_ROLES } from "@/modules/admin/users/schemas";

export function UserAdminActions({
  userId,
  role,
  status,
  canWrite,
  canElevate,
  isSelf,
}: {
  userId: string;
  role: string;
  status: string;
  canWrite: boolean;
  canElevate: boolean;
  isSelf: boolean;
}) {
  const t = useTranslations("admin.users");
  const tc = useTranslations("admin.common");
  if (!canWrite || isSelf) return null;
  const roles = PLATFORM_ROLES.filter((r) => canElevate || (r !== "ADMIN" && r !== "SUPER_ADMIN"));
  const elevatedTarget = role === "ADMIN" || role === "SUPER_ADMIN";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!elevatedTarget || canElevate ? (
        <DialogForm
          action={changePlatformRoleAction}
          hidden={{ userId }}
          title={t("changeRole")}
          description={t("changeRoleHint")}
          submitLabel={tc("save")}
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="secondary" size="sm" onClick={open}>
              <UserCog /> {t("changeRole")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={t("platformRole")} htmlFor="role" error={fieldError("role")} required>
              <Select id="role" name="role" defaultValue={role}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </DialogForm>
      ) : null}
      {status === "SUSPENDED" ? (
        <ActionForm action={setUserStatusAction} hidden={{ userId, status: "ACTIVE" }} label={t("reactivate")} icon={<ShieldCheck />} variant="primary" />
      ) : (
        <DialogForm
          action={setUserStatusAction}
          hidden={{ userId, status: "SUSPENDED" }}
          title={t("suspend")}
          description={t("suspendHint")}
          submitLabel={t("suspend")}
          submitVariant="danger"
          cancelLabel={tc("cancel")}
          trigger={(open) => (
            <Button variant="danger" size="sm" onClick={open}>
              <UserX /> {t("suspend")}
            </Button>
          )}
        >
          {({ fieldError }) => (
            <Field label={tc("reason")} htmlFor="reason" error={fieldError("reason")}>
              <Textarea id="reason" name="reason" rows={3} />
            </Field>
          )}
        </DialogForm>
      )}
      <ActionForm action={forceLogoutAction} hidden={{ userId }} label={t("forceLogout")} icon={<LogOut />} />
    </div>
  );
}
