"use client";

import { useActionState, useState } from "react";
import { deleteAccount } from "@/app/(app)/settings/actions";
import type { ActionResult } from "@/lib/viewer";
import { FormError, SubmitButton } from "./form-controls";
import { Button, Input } from "./ui";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionResult, FormData>(deleteAccount, null);
  if (!open) {
    return (
      <Button type="button" variant="danger" size="xl" block onClick={() => setOpen(true)}>
        Delete account…
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <p className="text-[16px] font-medium">
        This permanently deletes your account and <b>all</b> workouts, weigh-ins, to-dos and reminders. Export your data first if you want a copy.
      </p>
      <Input name="confirm" placeholder="Type DELETE to confirm" autoComplete="off" autoCapitalize="characters" />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton variant="bare" size="xl" pendingText="Deleting…" className="bg-danger text-white">
        Permanently delete everything
      </SubmitButton>
      <Button type="button" variant="secondary" size="lg" block onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
