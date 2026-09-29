import type { Metadata } from "next";
import { Download } from "lucide-react";
import { DeleteAccount } from "@/components/delete-account";
import { ProfileForm } from "@/components/profile-form";
import { PushSettings } from "@/components/push-settings";
import { PageHeader, Rows, Tile } from "@/components/ui";
import { vapidPublicKey } from "@/lib/env";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Settings" };

function SectionTitle({ children, className = "text-muted" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`mb-3 text-[16px] font-bold ${className}`}>{children}</h2>;
}

export default async function SettingsPage() {
  const { supabase, profile, unit, userId } = await getViewer();
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);

  return (
    <>
      <PageHeader back={{ href: "/more", label: "More" }} title="Settings" subtitle={profile.email} />

      <Tile>
        <SectionTitle>Profile</SectionTitle>
        <ProfileForm initial={{ display_name: profile.display_name, unit, timezone: profile.timezone, weekly_workout_goal: profile.weekly_workout_goal, notify_milestones: profile.notify_milestones }} />
      </Tile>

      <Tile tone="reminders" id="notifications" className="scroll-mt-4">
        <SectionTitle className="">Notifications</SectionTitle>
        <PushSettings vapidKey={vapidPublicKey()} deviceCount={count ?? 0} />
      </Tile>

      <Tile>
        <SectionTitle>Your data</SectionTitle>
        <Rows>
          {[
            { type: "weight", label: "Weigh-ins" },
            { type: "workouts", label: "Workouts (every set)" },
            { type: "todos", label: "To-dos and completions" },
            { type: "teeth", label: "Teeth brushing" },
          ].map((e) => (
            <a key={e.type} href={`/api/export?type=${e.type}`} className="flex min-h-14 items-center gap-3.5 py-3 active:opacity-70" download>
              <Download className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
              <span className="flex-1 text-[18px] font-bold">{e.label}</span>
              <span className="font-mono text-[14px] text-muted">CSV</span>
            </a>
          ))}
        </Rows>
      </Tile>

      <Tile>
        <SectionTitle className="text-danger">Danger zone</SectionTitle>
        <DeleteAccount />
      </Tile>
    </>
  );
}
