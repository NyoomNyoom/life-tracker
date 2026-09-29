"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form-controls";
import { Notice } from "@/components/ui";
import { dismissFromEmail, type DismissState } from "./actions";

export function DismissForm({ token }: { token: string }) {
  const [state, action] = useActionState<DismissState, FormData>(dismissFromEmail, null);
  if (state) return <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>;
  return (
    <form action={action} className="rounded-tile bg-reminders p-6 text-reminders-ink">
      <input type="hidden" name="token" value={token} />
      <h1 className="display mb-6 text-[38px]">Skip this reminder today?</h1>
      <SubmitButton variant="bare" size="xl" pendingText="Dismissing…" className="bg-reminders-ink text-white">
        Dismiss for today
      </SubmitButton>
    </form>
  );
}
