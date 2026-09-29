import type { Metadata } from "next";
import { turnstileSiteKey } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; deleted?: string }> }) {
  const params = await searchParams;
  return (
    <LoginForm
      next={safeNext(params.next)}
      siteKey={turnstileSiteKey()}
      notice={
        params.error === "link"
          ? "That link is invalid or has expired. Sign in, or request a new one."
          : params.deleted
            ? "Your account and all of its data have been deleted."
            : undefined
      }
    />
  );
}
