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
      <div className="p-4">
        <Button type="button" variant="danger" block onClick={() => setOpen(true)}>
          Delete account…
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3 p-4">
      <p className="text-[15px]">
        This permanently deletes your account and <b>all</b> workouts, weigh-ins, to-dos and reminders. Export your data first if you want a copy.
      </p>
      <Input name="confirm" placeholder="Type DELETE to confirm" autoComplete="off" autoCapitalize="characters" />
      <FormError message={state && !state.ok ? state.error : null} />
      <SubmitButton variant="danger" pendingText="Deleting…">
        Permanently delete everything
      </SubmitButton>
      <Button type="button" variant="ghost" block onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
