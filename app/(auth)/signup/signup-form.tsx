"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormError, Segmented, SubmitButton } from "@/components/form-controls";
import { Turnstile } from "@/components/turnstile";
import { Field, Input, Notice } from "@/components/ui";
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
      <div className="space-y-4 text-center">
        <h1 className="text-[28px] font-bold tracking-tight">Check your email</h1>
        <p className="text-[16px] text-muted">{state.message}</p>
        <Link href="/login" className="inline-block text-[15px] font-semibold text-accent">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-center text-[28px] font-bold tracking-tight">Create your account</h1>
      <form action={action} className="space-y-4">
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
          <span className="mb-1.5 block text-[14px] font-medium text-muted">Weights in</span>
          <Segmented name="unit" value={unit} onChange={setUnit} options={[{ value: "kg", label: "Kilograms" }, { value: "lb", label: "Pounds" }]} />
        </div>
        <FormError message={state?.error} />
        <Turnstile resetOn={state} siteKey={siteKey} />
        <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
        <Notice>Timezone: {timezone}. Reminders use this; you can change it later in Settings.</Notice>
      </form>
      <p className="text-center text-[15px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent">
          Sign in
        </Link>
      </p>
    </div>
  );
}
