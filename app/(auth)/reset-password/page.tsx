"use client";

import { useActionState, useState } from "react";
import { FormError, SubmitButton } from "@/components/form-controls";
import { Field, Input } from "@/components/ui";
import { updatePassword, type AuthState } from "../actions";
import { AuthCard, AuthHeader } from "../auth-header";

export default function ResetPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // Flag a mismatch as soon as the confirmation is as long as the password.
  const mismatch = confirm.length >= password.length && confirm.length > 0 && confirm !== password;
  return (
    <div>
      <AuthHeader title="Choose a new password" />
      <form action={action}>
        <AuthCard>
          <Field label="New password" hint="At least 8 characters.">
            <Input name="password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm new password">
            <Input
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              invalid={mismatch}
            />
          </Field>
          <FormError message={mismatch ? "The two passwords don't match." : state?.error} />
          <SubmitButton size="xl" disabled={mismatch}>
            Update password
          </SubmitButton>
        </AuthCard>
      </form>
    </div>
  );
}
