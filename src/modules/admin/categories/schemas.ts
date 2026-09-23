import { z } from "zod";
import { checkbox, idSchema, optionalText, requiredInt } from "../shared";

export const categoryFormSchema = z.object({
  categoryId: z.string().trim().optional().transform((v) => (v ? v : null)),
  name: z.string().trim().min(2, "Enter a name").max(120),
  nameVi: z.string().trim().min(2, "Enter the Vietnamese name").max(120),
  slug: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : null)),
  parentId: z.string().trim().optional().transform((v) => (v ? v : null)),
  industryId: z.string().trim().optional().transform((v) => (v ? v : null)),
  description: optionalText(2000),
  descriptionVi: optionalText(2000),
  icon: optionalText(80),
  sortOrder: requiredInt.default(0),
  isActive: checkbox,
  isFeatured: checkbox,
});
export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const categoryToggleSchema = z.object({ categoryId: idSchema, isActive: z.enum(["true", "false"]) });
