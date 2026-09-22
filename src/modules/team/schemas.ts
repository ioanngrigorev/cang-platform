import { z } from "zod";

/** Roles a company admin can hand out (OWNER is transferred, not invited). */
export const ASSIGNABLE_ROLES = ["ADMIN", "MANAGER", "PURCHASING", "FINANCE", "STAFF", "VIEWER"] as const;

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(ASSIGNABLE_ROLES),
  title: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : null)),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const changeRoleSchema = z.object({ memberId: z.string().min(1), role: z.enum(ASSIGNABLE_ROLES) });
export const memberIdSchema = z.object({ memberId: z.string().min(1) });
export const invitationIdSchema = z.object({ invitationId: z.string().min(1) });
