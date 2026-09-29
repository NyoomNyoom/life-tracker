"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormError, Segmented, SubmitButton } from "@/components/form-controls";
import { Turnstile } from "@/components/turnstile";
import { BackLink, Field, Input, Notice } from "@/components/ui";
import { AuthCard, AuthHeader } from "../auth-header";
import { useDeviceTimezone, useDeviceUnit } from "@/lib/use-device";
import { signUp, type AuthState } from "../actions";

export function SignupForm({ siteKey }: { siteKey?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUp, null);
  // Sensible defaults from the phone: its timezone, and pounds for US English.
  const timezone = useDeviceTimezone() ?? "UTC";
  const deviceUnit = useDeviceUnit();
  const [chosenUnit, setUnit] = useState<"kg" | "lb" | null>(null);
  const unit = chosenUnit ?? deviceUnit;

  if (state?.message) {
    return (
      <div>
        <AuthHeader title="Check your email" subtitle={state.message} />
        <div className="px-2">
          <BackLink href="/login" label="Back to sign in" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeader title="Create your account" />
      <form action={action}>
        <AuthCard>
          <input type="hidden" name="timezone" value={timezone} />
          <Field label="Name" hint="Optional. Used to greet you.">
            <Input name="displayName" autoComplete="given-name" maxLength={60} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.email} />
          </Field>
          <Field label="Password" hint="At least 8 characters. Your phone can suggest a strong one.">
            <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
          <div>
            <span className="mb-2 block text-[15px] font-bold">Weights in</span>
            <Segmented label="Weights in" name="unit" value={unit} onChange={setUnit} options={[{ value: "kg", label: "Kilograms" }, { value: "lb", label: "Pounds" }]} />
          </div>
          <FormError message={state?.error} />
          <Turnstile resetOn={state} siteKey={siteKey} />
          <SubmitButton size="xl" pendingText="Creating account…">
            Create account
          </SubmitButton>
          <Notice tone="reminders">
            <span className="font-medium">
              Timezone: <b className="font-extrabold">{timezone}</b>. Reminders use this; you can change it later in Settings.
            </span>
          </Notice>
        </AuthCard>
      </form>
      <p className="mt-6 px-2 text-[17px] font-medium text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-extrabold text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
