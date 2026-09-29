"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/form-controls";
import { Notice } from "@/components/ui";
import { dismissFromEmail, type DismissState } from "./actions";

export function DismissForm({ token }: { token: string }) {
  const [state, action] = useActionState<DismissState, FormData>(dismissFromEmail, null);
  if (state) return <Notice tone={state.ok ? "accent" : "danger"}>{state.message}</Notice>;
  return (
    <form action={action}>
      <input type="hidden" name="token" value={token} />
      <SubmitButton pendingText="Dismissing…">Dismiss for today</SubmitButton>
    </form>
  );
}
