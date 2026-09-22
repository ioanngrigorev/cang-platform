import { z } from "zod";

/**
 * Server-side environment. Never import this file from a client component.
 * Secrets stay on the server; only NEXT_PUBLIC_* values reach the browser.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  OTP_PROVIDER: z.enum(["console", "twilio"]).default("console"),
  REDIS_URL: z.string().optional().default(""),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: z.string().optional().default(""),
  S3_REGION: z.string().optional().default(""),
  S3_ENDPOINT: z.string().optional().default(""),
  S3_ACCESS_KEY_ID: z.string().optional().default(""),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(""),
  CDN_URL: z.string().optional().default(""),
  SEARCH_PROVIDER: z.enum(["postgres", "opensearch"]).default("postgres"),
  OPENSEARCH_URL: z.string().optional().default(""),
  EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
  SMTP_URL: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("CANG <no-reply@cang.vn>"),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => process.env.NODE_ENV === "production";
