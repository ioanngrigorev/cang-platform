/** Badge colour helpers shared by admin tables (plain functions, safe in server components). */
export const priorityVariant = (p: string) => (p === "urgent" ? "danger" : p === "high" ? "warning" : p === "low" ? "neutral" : "info") as "danger" | "warning" | "neutral" | "info";
export const severityVariant = (s: string) => (s === "CRITICAL" || s === "HIGH" ? "danger" : s === "MEDIUM" ? "warning" : "neutral") as "danger" | "warning" | "neutral";

/** Humanize an enum code but keep short acronyms (KYB, UBO, AML…) upper-case. */
export const codeLabel = (code: string) => (code.length <= 4 && !code.includes("_") ? code : code.toLowerCase().split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
