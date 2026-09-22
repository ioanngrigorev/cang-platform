import "server-only";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { ActionError } from "@/lib/action";
import { buildStorageKey, checksum, isAllowedMime, maxUploadBytes, sniffMime, storage } from "./index";

export type UploadScope =
  | "product"
  | "company"
  | "rfq"
  | "quotation"
  | "order"
  | "message"
  | "verification"
  | "dispute"
  | "shipment"
  | "financing"
  | "avatar"
  | "cms";

export type DocumentType = typeof documents.$inferInsert.type;
export type DocumentVisibility = typeof documents.$inferInsert.visibility;

export type UploadInput = {
  file: File;
  scope: UploadScope;
  type?: DocumentType;
  visibility?: DocumentVisibility;
  ownerCompanyId?: string | null;
  uploadedById?: string | null;
  links?: Partial<
    Pick<
      typeof documents.$inferInsert,
      "orderId" | "rfqId" | "quotationId" | "messageId" | "verificationId" | "disputeId" | "shipmentId" | "financingApplicationId"
    >
  >;
};

/** Validate, store and register an uploaded file. Returns the Document row. */
export async function saveUpload(input: UploadInput) {
  const { file } = input;
  if (!file || typeof file.arrayBuffer !== "function") throw new ActionError("No file provided.", "UPLOAD_INVALID");
  if (file.size === 0) throw new ActionError("The file is empty.", "UPLOAD_INVALID");
  if (file.size > maxUploadBytes()) throw new ActionError(`File is larger than ${maxUploadBytes() / 1024 / 1024} MB.`, "UPLOAD_TOO_LARGE");
  const declared = file.type || "application/octet-stream";
  if (!isAllowedMime(declared)) throw new ActionError("This file type is not allowed.", "UPLOAD_TYPE");
  const buf = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buf, declared);
  if (!sniffed || (sniffed !== declared && !(sniffed === "application/zip" && declared.includes("officedocument")))) {
    throw new ActionError("File content does not match its type.", "UPLOAD_TYPE");
  }
  const key = buildStorageKey(input.scope, file.name, declared);
  const { url } = await storage().put(key, buf, declared);
  const [doc] = await db
    .insert(documents)
    .values({
      ownerCompanyId: input.ownerCompanyId ?? null,
      uploadedById: input.uploadedById ?? null,
      type: input.type ?? (declared.startsWith("image/") ? "PHOTO" : "OTHER"),
      name: file.name.slice(0, 200),
      mimeType: declared,
      sizeBytes: file.size,
      storageKey: key,
      url,
      checksum: checksum(buf),
      visibility: input.visibility ?? "COMPANY",
      ...input.links,
    })
    .returning();
  return doc;
}
