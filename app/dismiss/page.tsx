import type { Metadata } from "next";
import { LogoMark } from "@/components/icons";
import { verifyDismissToken } from "@/lib/links";
import { DismissForm } from "./dismiss-form";

export const metadata: Metadata = { title: "Dismiss reminder", robots: { index: false } };

// Confirm-first page for the "dismiss for today" link in reminder emails. It needs a tap (a POST)
// so that link scanners that pre-open emails can't dismiss reminders by accident.
export default async function DismissPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const valid = verifyDismissToken(token) != null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-5 py-10">
      <LogoMark size={60} />
      {valid ? (
        <DismissForm token={token} />
      ) : (
        <div className="rounded-[26px] bg-card px-6 py-5">
          <h1 className="text-[20px] font-extrabold">Link expired</h1>
          <p className="mt-1 text-[16px] font-medium text-muted">Open the app to manage your reminders.</p>
        </div>
      )}
    </main>
  );
}
