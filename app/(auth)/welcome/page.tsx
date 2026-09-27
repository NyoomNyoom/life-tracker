import type { Metadata } from "next";
import { Share, SquarePlus } from "lucide-react";
import { LinkButton } from "@/components/ui";

export const metadata: Metadata = { title: "You're in" };

export default function WelcomePage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-[28px] font-bold tracking-tight">Email confirmed 🎉</h1>
        <p className="mt-2 text-[16px] text-muted">Your account is ready. Put it on your Home Screen so it works like an app.</p>
      </div>
      <ol className="space-y-3 rounded-2xl bg-card p-4 text-[15px]">
        <li className="flex gap-3">
          <span className="font-semibold text-accent">1</span>
          <span>
            Open this site in <b>Safari</b> and tap the <Share className="inline size-4 align-[-2px]" aria-label="Share" /> Share button.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-semibold text-accent">2</span>
          <span>
            Choose <SquarePlus className="inline size-4 align-[-2px]" aria-hidden /> <b>Add to Home Screen</b>, then <b>Add</b>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="font-semibold text-accent">3</span>
          <span>Open <b>Tracker</b> from your Home Screen and sign in once. The Home Screen app keeps its own login, separate from Safari.</span>
        </li>
        <li className="flex gap-3">
          <span className="font-semibold text-accent">4</span>
          <span>In the app, go to <b>More → Settings</b> and turn on notifications for reminders.</span>
        </li>
      </ol>
      <LinkButton href="/" size="lg" block>
        Continue in the browser
      </LinkButton>
    </div>
  );
}
