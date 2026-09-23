import { z } from "zod";

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const money = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  })
  .refine((n) => n === null || (!Number.isNaN(n) && n >= 0), "Enter a valid amount");

const date = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Enter a valid date");

export const createCampaignSchema = z
  .object({
    adProductId: z.string().trim().min(1, "Choose an ad product"),
    name: z.string().trim().min(3, "Give the campaign a name").max(120),
    productId: optionalText(64),
    dailyBudget: money,
    budget: money.refine((n) => n !== null && n > 0, "Enter the total budget"),
    startAt: date.refine((d) => d !== null, "Choose a start date"),
    endAt: date,
    keywords: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) =>
        (v ?? "")
          .split(/[,\n]/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 20),
      ),
  })
  .refine((d) => !d.endAt || !d.startAt || d.endAt >= d.startAt, { path: ["endAt"], message: "End date must be after the start date" })
  .refine((d) => d.dailyBudget === null || d.budget === null || d.dailyBudget <= d.budget, { path: ["dailyBudget"], message: "Daily budget cannot exceed the total budget" });
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const campaignIdSchema = z.object({ campaignId: z.string().trim().min(1) });
