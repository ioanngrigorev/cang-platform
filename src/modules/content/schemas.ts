import { z } from "zod";

export const CONTACT_CATEGORIES = ["general", "buyer", "supplier", "partnership", "billing", "technical"] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export const contactSchema = z.object({
  subject: z.string().trim().min(4, "Subject is too short").max(160),
  category: z.enum(CONTACT_CATEGORIES).default("general"),
  message: z.string().trim().min(20, "Please give us a little more detail (at least 20 characters)").max(5000),
});

export type ContactInput = z.infer<typeof contactSchema>;
