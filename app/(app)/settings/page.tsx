import type { Metadata } from "next";
import { Download } from "lucide-react";
import { DeleteAccount } from "@/components/delete-account";
import { ProfileForm } from "@/components/profile-form";
import { PushSettings } from "@/components/push-settings";
import { Card, CardHeader } from "@/components/ui";
import { vapidPublicKey } from "@/lib/env";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, profile, unit, userId } = await getViewer();
  const { count } = await supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", userId);

  return (
    <>
      <header className="px-4 pt-4 pb-3">
        <h1 className="text-[28px] font-bold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-[15px] text-muted">{profile.email}</p>
      </header>

      <Card>
        <CardHeader title="Profile" />
        <ProfileForm initial={{ display_name: profile.display_name, unit, timezone: profile.timezone, weekly_workout_goal: profile.weekly_workout_goal }} />
      </Card>

      <Card id="notifications">
        <CardHeader title="Notifications" />
        <PushSettings vapidKey={vapidPublicKey()} deviceCount={count ?? 0} />
      </Card>

      <Card>
        <CardHeader title="Your data" />
        <ul className="divide-y divide-border">
          {[
            { type: "weight", label: "Weigh-ins" },
            { type: "workouts", label: "Workouts (every set)" },
            { type: "todos", label: "To-dos and completions" },
          ].map((e) => (
            <li key={e.type}>
              <a href={`/api/export?type=${e.type}`} className="flex items-center gap-3 px-4 py-3 text-[16px] active:bg-card-pressed" download>
                <Download className="size-5 text-accent" aria-hidden />
                <span className="flex-1">{e.label}</span>
                <span className="text-[13px] text-muted">CSV</span>
              </a>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardHeader title="Danger zone" />
        <DeleteAccount />
      </Card>
    </>
  );
}
