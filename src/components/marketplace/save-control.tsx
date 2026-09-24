import { Bookmark } from "lucide-react";
import { SaveButton } from "@/components/buyer/save-button";
import { Button } from "@/components/ui/button";
import type { AuthContext } from "@/modules/auth/current-user";
import { isSavedByUser } from "@/modules/saved/queries";

/**
 * "Save" on public product / supplier pages. Signed in: a real toggle showing the current state.
 * Signed out: sign-in link that returns to this page (not to the saved list), so the visitor can save it.
 */
export async function SaveControl({
  auth,
  kind,
  id,
  returnTo,
  label,
  savedLabel,
  size = "sm",
  variant = "secondary",
  compactLabel = false,
}: {
  auth: AuthContext | null;
  kind: "product" | "supplier";
  id: string;
  returnTo: string;
  label: string;
  savedLabel: string;
  size?: "sm" | "md" | "lg";
  variant?: "secondary" | "ghost";
  compactLabel?: boolean;
}) {
  if (!auth) {
    return (
      <Button href={`/login?next=${encodeURIComponent(returnTo)}`} variant={variant} size={size}>
        <Bookmark /> {compactLabel ? <span className="hidden sm:inline">{label}</span> : label}
      </Button>
    );
  }
  const saved = await isSavedByUser(auth.user.id, kind, id);
  return <SaveButton kind={kind} id={id} saved={saved} labelSave={label} labelSaved={savedLabel} size={size} variant={variant} compactLabel={compactLabel} />;
}
