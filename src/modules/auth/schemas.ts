import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");
export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
  remember: z.coerce.boolean().optional(),
  next: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const accountTypeSchema = z.enum(["BUYER", "SELLER", "LOGISTICS"]);

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    accountType: accountTypeSchema,
    companyName: z.string().trim().min(2, "Enter your company name").max(200),
    countryCode: z.string().trim().length(2, "Select a country").toUpperCase(),
    phone: z.string().trim().max(32).optional().or(z.literal("")),
    acceptTerms: z.union([z.literal("on"), z.literal(true), z.literal("true")], {
      errorMap: () => ({ message: "You must accept the Terms of Service" }),
    }),
    locale: z.string().optional(),
    next: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  locale: z.enum(["en", "vi"]).optional(),
  timezone: z.string().max(64).optional(),
});

export const phoneOtpRequestSchema = z.object({
  phone: z.string().trim().regex(/^\+?[0-9]{8,15}$/, "Enter a valid phone number with country code"),
});
export const phoneOtpVerifySchema = z.object({
  phone: z.string().trim(),
  code: z.string().trim().length(6, "Enter the 6-digit code"),
});
