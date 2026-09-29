import type { Metadata } from "next";
import { turnstileSiteKey } from "@/lib/env";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return <SignupForm siteKey={turnstileSiteKey()} />;
}
