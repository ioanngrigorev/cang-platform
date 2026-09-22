import { z } from "zod";

const star = z.coerce.number().int().min(1, "Choose a rating").max(5);

export const createReviewSchema = z.object({
  orderId: z.string().min(1, "Choose the order you are reviewing"),
  ratingQuality: star,
  ratingCommunication: star,
  ratingDelivery: star,
  ratingAccuracy: star,
  ratingService: star,
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
  body: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((v) => (v ? v : null)),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
