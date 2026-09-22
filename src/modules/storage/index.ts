import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

/**
 * Object storage abstraction. Local disk for development / single-node deployments;
 * an S3-compatible provider (AWS S3, Cloudflare R2, MinIO, Viettel Cloud) for production — swap via STORAGE_PROVIDER.
 */
export interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<{ url: string }>;
  get(key: string): Promise<{ data: Buffer; contentType?: string } | null>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

const LOCAL_ROOT = path.join(process.cwd(), "storage", "uploads");

class LocalDiskStorage implements StorageProvider {
  private resolve(key: string) {
    const safe = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const full = path.join(LOCAL_ROOT, safe);
    if (!full.startsWith(LOCAL_ROOT)) throw new Error("Invalid storage key");
    return full;
  }
  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return { url: this.publicUrl(key) };
  }
  async get(key: string) {
    const full = this.resolve(key);
    try {
      await stat(full);
      return { data: await readFile(full) };
    } catch {
      return null;
    }
  }
  async delete(key: string) {
    try {
      await unlink(this.resolve(key));
    } catch {
      /* ignore */
    }
  }
  publicUrl(key: string) {
    return `/api/files/${key}`;
  }
}

let provider: StorageProvider | null = null;
export function storage(): StorageProvider {
  if (provider) return provider;
  // case "s3": provider = new S3Storage({...env()}) — implement with @aws-sdk/client-s3 when needed.
  provider = new LocalDiskStorage();
  return provider;
}

export const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "application/zip": "zip",
  "video/mp4": "mp4",
};

export function isAllowedMime(mime: string) {
  return mime in ALLOWED_MIME;
}

/** Content-sniff the first bytes so a renamed executable cannot pass as an image/pdf. */
export function sniffMime(buf: Buffer, declared: string): string | null {
  const b = buf.subarray(0, 12);
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.toString("ascii", 0, 3) === "GIF") return "image/gif";
  if (b.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  if (b[0] === 0x50 && b[1] === 0x4b) {
    // zip container: docx/xlsx/zip
    if (["application/zip", ALLOWED_MIME_KEYS.docx, ALLOWED_MIME_KEYS.xlsx].includes(declared)) return declared;
    return "application/zip";
  }
  if (b.toString("ascii", 4, 8) === "ftyp") return "video/mp4";
  if (declared === "text/csv" || declared === "application/msword" || declared === "application/vnd.ms-excel") return declared;
  return null;
}

const ALLOWED_MIME_KEYS = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function buildStorageKey(scope: string, originalName: string, mime: string) {
  const ext = ALLOWED_MIME[mime] ?? "bin";
  const id = randomBytes(12).toString("hex");
  const date = new Date();
  const safeScope = scope.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "misc";
  void originalName; // original name is kept in the documents table, never in the key
  return `${safeScope}/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${id}.${ext}`;
}

export function checksum(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

export function maxUploadBytes() {
  return (Number(process.env.UPLOAD_MAX_MB ?? 10) || 10) * 1024 * 1024;
}
