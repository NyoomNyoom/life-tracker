"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError, SubmitButton } from "@/components/form-controls";
import { Turnstile } from "@/components/turnstile";
import { Field, Input, Notice, buttonClass } from "@/components/ui";
import { resendConfirmation, signIn, type AuthState } from "../actions";

const TILES = [
  { label: "Weigh-ins", tone: "bg-weight text-weight-ink" },
  { label: "Workouts", tone: "bg-training text-training-ink" },
  { label: "Brushing", tone: "bg-teeth text-teeth-ink" },
  { label: "Trails", tone: "bg-challenges text-challenges-ink" },
];

export function LoginForm({ next, siteKey, notice }: { next: string; siteKey?: string; notice?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, null);
  const [resendState, resendAction] = useActionState<AuthState, FormData>(resendConfirmation, null);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5" aria-hidden>
        {TILES.map((t) => (
          <div key={t.label} className={`flex h-[76px] items-end rounded-tile px-5 pb-3.5 text-[18px] font-extrabold ${t.tone}`}>
            {t.label}
          </div>
        ))}
      </div>

      <header className="px-2 pt-6 pb-3">
        <p className="text-[17px] font-bold text-muted">Life Tracker</p>
        <h1 className="display mt-2 text-[46px]">Welcome back</h1>
      </header>

      {notice && <Notice>{notice}</Notice>}
      <form action={action} className="space-y-4 rounded-tile bg-card p-5">
        <input type="hidden" name="next" value={next} />
        <Field label="Email">
          <Input name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required defaultValue={state?.email} />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <FormError message={state?.error} />
        <Turnstile resetOn={state} siteKey={siteKey} />
        <SubmitButton size="xl" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      {state?.needsConfirmation && (
        <form action={resendAction} className="space-y-3 rounded-tile bg-card p-5">
          <input type="hidden" name="email" value={state.email} />
          <Turnstile resetOn={resendState} siteKey={siteKey} />
          {resendState?.message ? <Notice tone="success">{resendState.message}</Notice> : <FormError message={resendState?.error} />}
          <SubmitButton variant="secondary" pendingText="Sending…">
            Resend confirmation email
          </SubmitButton>
        </form>
      )}

      <div className="flex items-center justify-between gap-3 pt-3 pl-2">
        <Link href="/forgot-password" className="text-[17px] font-bold text-muted active:opacity-70">
          Forgot password?
        </Link>
        <Link href="/signup" className={buttonClass("bare", "lg") + " bg-todos text-ink"}>
          Create account
        </Link>
      </div>
    </div>
  );
}
