"use client";

import { Check } from "lucide-react";
import { FormError, SubmitButton, useActionForm } from "@/components/ui";
import { useRouter } from "@/i18n/navigation";
import { acceptInvitationAction } from "@/modules/team/actions";

export function AcceptInvitation({ token, label, isSeller }: { token: string; label: string; isSeller: boolean }) {
  const router = useRouter();
  const { state, formAction } = useActionForm(acceptInvitationAction, {
    onSuccess: (data) => router.push(data.isSeller || isSeller ? "/seller" : "/buyer"),
  });
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <FormError state={state} />
      <SubmitButton variant="primary" className="w-full">
        <Check /> {label}
      </SubmitButton>
    </form>
  );
}
