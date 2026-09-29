"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/form-controls";
import { Turnstile } from "@/components/turnstile";
import { BackLink, Field, Input, Notice } from "@/components/ui";
import { requestPasswordReset, type AuthState } from "../actions";
import { AuthCard, AuthHeader } from "../auth-header";

export function ForgotForm({ siteKey }: { siteKey?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  return (
    <div className="space-y-2.5">
      <AuthHeader title="Reset password" subtitle="We'll email you a link to choose a new one." />
      {state?.message ? (
        <Notice tone="success">{state.message}</Notice>
      ) : (
        <form action={action}>
          <AuthCard>
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.email} />
            </Field>
            <FormError message={state?.error} />
            <Turnstile resetOn={state} siteKey={siteKey} />
            <SubmitButton size="xl" pendingText="Sending…">
              Send reset link
            </SubmitButton>
          </AuthCard>
        </form>
      )}
      <div className="px-2 pt-4">
        <BackLink href="/login" label="Back to sign in" />
      </div>
    </div>
  );
}
