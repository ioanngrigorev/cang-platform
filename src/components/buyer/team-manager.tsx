"use client";

import { Trash2, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ActionForm, DialogForm } from "@/components/buyer/action-form";
import { Avatar, Badge, Button, Field, Input, Select, StatusBadge, TBody, TD, TH, THead, TR, Table, useActionForm } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { changeMemberRoleAction, inviteMemberAction, removeMemberAction, revokeInvitationAction } from "@/modules/team/actions";
import { ASSIGNABLE_ROLES } from "@/modules/team/schemas";

export type TeamMemberRow = {
  id: string;
  role: string;
  status: string;
  title: string | null;
  joinedAt: string;
  isMe: boolean;
  user: { id: string; name: string; email: string; avatarUrl: string | null; lastLoginAt: string | null } | null;
};

export type InvitationRow = { id: string; email: string; role: string; createdAt: string; expiresAt: string; invitedBy: string | null };

export function InviteMemberButton() {
  const t = useTranslations("buyer.team");
  return (
    <DialogForm
      action={inviteMemberAction}
      title={t("inviteTitle")}
      description={t("inviteDescription")}
      submitLabel={t("inviteSubmit")}
      trigger={(open) => (
        <Button type="button" variant="primary" onClick={open}>
          <UserPlus /> {t("invite")}
        </Button>
      )}
    >
      {({ fieldError }) => (
        <div className="space-y-4">
          <Field label={t("inviteEmail")} htmlFor="invite-email" error={fieldError("email")} required>
            <Input id="invite-email" name="email" type="email" required />
          </Field>
          <Field label={t("inviteRole")} htmlFor="invite-role" error={fieldError("role")} required>
            <Select id="invite-role" name="role" defaultValue="PURCHASING" required>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)} — {t(`roleHints.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("inviteJobTitle")} htmlFor="invite-title" error={fieldError("title")}>
            <Input id="invite-title" name="title" />
          </Field>
        </div>
      )}
    </DialogForm>
  );
}

function RoleSelect({ memberId, role }: { memberId: string; role: string }) {
  const t = useTranslations("buyer.team");
  const { formAction } = useActionForm(changeMemberRoleAction);
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={formAction} className="inline-flex">
      <input type="hidden" name="memberId" value={memberId} />
      <Select name="role" defaultValue={role} aria-label={t("changeRole")} className="h-8 w-auto py-0 text-xs" onChange={() => formRef.current?.requestSubmit()}>
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {t(`roles.${r}`)}
          </option>
        ))}
      </Select>
    </form>
  );
}

export function TeamTable({ members, invitations, locale, canManage }: { members: TeamMemberRow[]; invitations: InvitationRow[]; locale: string; canManage: boolean }) {
  const t = useTranslations("buyer.team");
  return (
    <div className="space-y-6">
      <Table>
        <THead>
          <TR>
            <TH>{t("colName")}</TH>
            <TH className="hidden sm:table-cell">{t("colEmail")}</TH>
            <TH>{t("colRole")}</TH>
            <TH className="hidden md:table-cell">{t("colStatus")}</TH>
            <TH className="hidden lg:table-cell">{t("colJoined")}</TH>
            {canManage ? <TH /> : null}
          </TR>
        </THead>
        <TBody>
          {members.map((m) => (
            <TR key={m.id}>
              <TD>
                <span className="flex items-center gap-2.5">
                  <Avatar src={m.user?.avatarUrl} name={m.user?.name ?? "?"} size={32} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink-900">
                      {m.user?.name ?? "—"}
                      {m.isMe ? <span className="ml-1.5 text-xs text-steel-500">({t("you")})</span> : null}
                    </span>
                    {m.title ? <span className="block text-xs text-steel-500">{m.title}</span> : null}
                  </span>
                </span>
              </TD>
              <TD className="hidden text-steel-600 sm:table-cell">{m.user?.email ?? "—"}</TD>
              <TD>
                {canManage && m.role !== "OWNER" && !m.isMe ? (
                  <RoleSelect memberId={m.id} role={m.role} />
                ) : (
                  <Badge variant={m.role === "OWNER" ? "ink" : "neutral"}>{t(`roles.${m.role}`)}</Badge>
                )}
              </TD>
              <TD className="hidden md:table-cell">
                <StatusBadge status={m.status} />
              </TD>
              <TD className="hidden whitespace-nowrap text-steel-600 lg:table-cell">{formatDate(m.joinedAt, locale)}</TD>
              {canManage ? (
                <TD className="text-right">
                  {m.role !== "OWNER" && !m.isMe ? (
                    <DialogForm
                      action={removeMemberAction}
                      hidden={{ memberId: m.id }}
                      title={t("removeTitle")}
                      description={t("removeDescription")}
                      submitLabel={t("removeSubmit")}
                      submitVariant="danger"
                      trigger={(open) => (
                        <Button type="button" variant="ghost" size="icon" onClick={open} aria-label={t("remove")}>
                          <Trash2 className="text-danger-600" />
                        </Button>
                      )}
                    >
                      {() => null}
                    </DialogForm>
                  ) : null}
                </TD>
              ) : null}
            </TR>
          ))}
        </TBody>
      </Table>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-900">{t("invitations")}</h3>
        {invitations.length === 0 ? (
          <p className="text-sm text-steel-500">{t("noInvitations")}</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("colEmail")}</TH>
                <TH>{t("colRole")}</TH>
                <TH className="hidden sm:table-cell">{t("colInvited")}</TH>
                <TH className="hidden md:table-cell">{t("colExpires")}</TH>
                {canManage ? <TH /> : null}
              </TR>
            </THead>
            <TBody>
              {invitations.map((i) => (
                <TR key={i.id}>
                  <TD className="font-medium">{i.email}</TD>
                  <TD>
                    <Badge variant="neutral">{t(`roles.${i.role}`)}</Badge>
                  </TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 sm:table-cell">{formatDate(i.createdAt, locale)}</TD>
                  <TD className="hidden whitespace-nowrap text-steel-600 md:table-cell">{formatDate(i.expiresAt, locale)}</TD>
                  {canManage ? (
                    <TD className="text-right">
                      <ActionForm action={revokeInvitationAction} hidden={{ invitationId: i.id }} label={t("revoke")} icon={<X />} variant="ghost" size="xs" />
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  );
}
