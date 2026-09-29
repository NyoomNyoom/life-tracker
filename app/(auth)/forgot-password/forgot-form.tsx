"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/form-controls";
import { Turnstile } from "@/components/turnstile";
import { Field, Input, Notice } from "@/components/ui";
import { requestPasswordReset, type AuthState } from "../actions";

export function ForgotForm({ siteKey }: { siteKey?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, null);
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-[28px] font-bold tracking-tight">Reset password</h1>
        <p className="mt-1 text-[15px] text-muted">We&apos;ll email you a link to choose a new one.</p>
      </div>
      {state?.message ? (
        <Notice tone="accent">{state.message}</Notice>
      ) : (
        <form action={action} className="space-y-4 rounded-2xl bg-card p-4">
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.email} />
          </Field>
          <FormError message={state?.error} />
          <Turnstile resetOn={state} siteKey={siteKey} />
          <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
        </form>
      )}
      <p className="text-center text-[15px]">
        <Link href="/login" className="text-accent">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
