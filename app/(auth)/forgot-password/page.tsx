import type { Metadata } from "next";
import { turnstileSiteKey } from "@/lib/env";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <ForgotForm siteKey={turnstileSiteKey()} />;
}
