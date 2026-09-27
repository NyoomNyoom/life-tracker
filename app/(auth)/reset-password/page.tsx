"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/form-controls";
import { Field, Input } from "@/components/ui";
import { updatePassword, type AuthState } from "../actions";

export default function ResetPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, null);
  return (
    <div className="space-y-6">
      <h1 className="text-center text-[28px] font-bold tracking-tight">Choose a new password</h1>
      <form action={action} className="space-y-4">
        <Field label="New password" hint="At least 8 characters.">
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm new password">
          <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <FormError message={state?.error} />
        <SubmitButton>Update password</SubmitButton>
      </form>
    </div>
  );
}
