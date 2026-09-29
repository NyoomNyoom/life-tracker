import type { Metadata } from "next";
import Image from "next/image";
import { verifyDismissToken } from "@/lib/links";
import { DismissForm } from "./dismiss-form";

export const metadata: Metadata = { title: "Dismiss reminder", robots: { index: false } };

// Confirm-first page for the "dismiss for today" link in reminder emails. It needs a tap (a POST)
// so that link scanners that pre-open emails can't dismiss reminders by accident.
export default async function DismissPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = verifyDismissToken(token) != null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-5 text-center">
      <Image src="/icons/icon-192.png" alt="" width={56} height={56} className="mx-auto rounded-2xl" />
      <h1 className="text-[24px] font-bold">{valid ? "Skip this reminder today?" : "Link expired"}</h1>
      {valid ? <DismissForm token={token} /> : <p className="text-muted">Open the app to manage your reminders.</p>}
    </main>
  );
}
