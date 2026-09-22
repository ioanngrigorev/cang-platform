import { NextResponse, type NextRequest } from "next/server";
import { ActionError } from "@/lib/action";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { requireAuth } from "@/modules/auth/current-user";
import { saveUpload, type UploadScope } from "@/modules/storage/upload";

const SCOPES: UploadScope[] = ["product", "company", "rfq", "quotation", "order", "message", "verification", "dispute", "shipment", "financing", "avatar", "cms"];

/** Generic authenticated upload endpoint used by dashboard forms (multipart/form-data: file, scope, visibility?). */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const rl = await rateLimit(`upload:${auth.user.id}`, RATE_LIMITS.upload);
    if (!rl.allowed) return NextResponse.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
    const form = await req.formData();
    const file = form.get("file");
    const scope = String(form.get("scope") ?? "");
    const visibility = String(form.get("visibility") ?? "COMPANY");
    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, { status: 400 });
    if (!SCOPES.includes(scope as UploadScope)) return NextResponse.json({ error: "invalid scope" }, { status: 400 });
    const doc = await saveUpload({
      file,
      scope: scope as UploadScope,
      visibility: visibility === "PUBLIC" ? "PUBLIC" : "COMPANY",
      ownerCompanyId: auth.activeMembership?.companyId ?? null,
      uploadedById: auth.user.id,
    });
    return NextResponse.json({ id: doc.id, url: doc.url, name: doc.name, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes });
  } catch (err) {
    if (err instanceof ActionError) return NextResponse.json({ error: err.message, code: err.code }, { status: err.code === "UNAUTHORIZED" ? 401 : 400 });
    console.error("[upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
