"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { siteUrl } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  message?: string;
  email?: string;
  needsConfirmation?: boolean;
} | null;

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));
const password = z.string().min(8, "Passwords need at least 8 characters.").max(72, "Passwords can be at most 72 characters.");

function captcha(formData: FormData): string | undefined {
  return (formData.get("cf-turnstile-response") as string | null) || undefined;
}

function friendlyAuthError(code: string | undefined, message: string): string {
  switch (code) {
    case "invalid_credentials":
      return "Wrong email or password.";
    case "captcha_failed":
      return "The CAPTCHA check failed. Please try again.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a minute and try again.";
    case "weak_password":
      return "That password is too easy to guess. Try a longer one.";
    case "same_password":
      return "Your new password must be different from the old one.";
    default:
      return message;
  }
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password.") }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: String(formData.get("email") ?? "") };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    ...parsed.data,
    options: { captchaToken: captcha(formData) },
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email first. Check your inbox for the link.", email: parsed.data.email, needsConfirmation: true };
    }
    return { error: friendlyAuthError(error.code, error.message), email: parsed.data.email };
  }
  redirect(safeNext(formData.get("next") as string | null));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({
      email,
      password,
      displayName: z.string().trim().max(60).optional(),
      timezone: z.string().max(64).optional(),
      unit: z.enum(["kg", "lb"]).default("kg"),
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      displayName: formData.get("displayName") || undefined,
      timezone: formData.get("timezone") || undefined,
      unit: formData.get("unit") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message, email: String(formData.get("email") ?? "") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=/welcome`,
      captchaToken: captcha(formData),
      // Read by the database trigger that creates the profile.
      data: { display_name: parsed.data.displayName, timezone: parsed.data.timezone, unit: parsed.data.unit },
    },
  });
  if (error) return { error: friendlyAuthError(error.code, error.message), email: parsed.data.email };

  // Email confirmation disabled (e.g. some local setups): already signed in.
  if (data.session) redirect("/");

  // Supabase deliberately gives the same answer for new and already-registered emails.
  return { message: `We sent a confirmation link to ${parsed.data.email}. Open it on this phone to finish signing up.`, email: parsed.data.email };
}

export async function resendConfirmation(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm?next=/welcome`, captchaToken: captcha(formData) },
  });
  if (error) return { error: friendlyAuthError(error.code, error.message), email: parsed.data };
  return { message: "Confirmation email sent again. Check your inbox (and spam folder).", email: parsed.data };
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
    captchaToken: captcha(formData),
  });
  if (error) return { error: friendlyAuthError(error.code, error.message), email: parsed.data };
  return { message: "If that email has an account, a reset link is on its way.", email: parsed.data };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = password.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (formData.get("password") !== formData.get("confirm")) return { error: "The two passwords don't match." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: friendlyAuthError(error.code, error.message) };
  redirect("/?password=updated");
}
