import { z } from "zod";
import { idSchema, optionalText } from "../shared";

export const PLATFORM_ROLES = ["USER", "SUPPORT", "MODERATOR", "FINANCE", "COMPLIANCE", "ADMIN", "SUPER_ADMIN"] as const;

export const changeRoleSchema = z.object({ userId: idSchema, role: z.enum(PLATFORM_ROLES) });
export const userStatusSchema = z.object({ userId: idSchema, status: z.enum(["ACTIVE", "SUSPENDED"]), reason: optionalText(1000) });
export const userIdSchema = z.object({ userId: idSchema });
