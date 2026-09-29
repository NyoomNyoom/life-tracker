import type { Metadata } from "next";
import { Share, SquarePlus } from "lucide-react";
import { LinkButton, cx } from "@/components/ui";
import { AuthHeader } from "../auth-header";

export const metadata: Metadata = { title: "You're in" };

const STEPS = [
  {
    tone: "bg-weight text-weight-ink",
    body: (
      <>
        Open this site in <b>Safari</b> and tap the <Share className="inline size-5 align-[-3px]" aria-label="Share" /> Share button.
      </>
    ),
  },
  {
    tone: "bg-training text-training-ink",
    body: (
      <>
        Choose <SquarePlus className="inline size-5 align-[-3px]" aria-hidden /> <b>Add to Home Screen</b>, then <b>Add</b>.
      </>
    ),
  },
  {
    tone: "bg-todos text-todos-ink",
    body: (
      <>
        Open <b>Tracker</b> from your Home Screen and sign in once. The Home Screen app keeps its own login, separate from Safari.
      </>
    ),
  },
  {
    tone: "bg-challenges text-white",
    body: (
      <>
        In the app, go to <b>More → Settings</b> and turn on notifications for reminders.
      </>
    ),
  },
];

export default function WelcomePage() {
  return (
    <div>
      <AuthHeader showName={false} title="Email confirmed" subtitle="Your account is ready. Put it on your Home Screen so it works like an app." />
      <ol className="space-y-2">
        {STEPS.map((s, i) => (
          <li key={i} className={cx("flex gap-4 rounded-[26px] px-5 py-4 text-[17px] leading-snug font-medium", s.tone)}>
            <span className={cx("tile-number text-[34px]", i === 3 && "text-challenges-ink")}>{i + 1}</span>
            <span className="pt-1 [&_b]:font-extrabold">{s.body}</span>
          </li>
        ))}
      </ol>
      <LinkButton href="/" size="xl" block className="mt-5">
        Continue in the browser
      </LinkButton>
    </div>
  );
}
