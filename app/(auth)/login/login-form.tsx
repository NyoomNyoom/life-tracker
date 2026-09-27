"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/form-controls";
import { Turnstile } from "@/components/turnstile";
import { Field, Input, Notice } from "@/components/ui";
import { resendConfirmation, signIn, type AuthState } from "../actions";

export function LoginForm({ next, siteKey, notice }: { next: string; siteKey?: string; notice?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);
  const [resendState, resendAction] = useActionState<AuthState, FormData>(resendConfirmation, null);

  return (
    <div className="space-y-6">
      <h1 className="text-center text-[28px] font-bold tracking-tight">Welcome back</h1>
      {notice && <Notice>{notice}</Notice>}
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.email} />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <FormError message={state?.error} />
        <Turnstile resetOn={state} siteKey={siteKey} />
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      </form>

      {state?.needsConfirmation && (
        <form action={resendAction} className="space-y-3">
          <input type="hidden" name="email" value={state.email} />
          <Turnstile resetOn={resendState} siteKey={siteKey} />
          {resendState?.message ? <Notice tone="accent">{resendState.message}</Notice> : <FormError message={resendState?.error} />}
          <SubmitButton variant="secondary" pendingText="Sending…">
            Resend confirmation email
          </SubmitButton>
        </form>
      )}

      <div className="flex justify-between text-[15px]">
        <Link href="/forgot-password" className="text-accent">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-semibold text-accent">
          Create account
        </Link>
      </div>
    </div>
  );
}
