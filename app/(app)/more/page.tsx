import type { Metadata } from "next";
import { Award, Bell, Dumbbell, LogOut, NotebookTabs, Route, Settings, Smartphone, Smile } from "lucide-react";
import { Card, List, ListRow, PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "More" };

export default async function MorePage() {
  const { profile } = await getViewer();
  return (
    <>
      <PageHeader title="More" subtitle={profile.email} />
      <Card>
        <List>
          <ListRow href="/teeth" icon={<Smile className="size-5 text-accent" aria-hidden />} title="Teeth" subtitle="Morning and night brushing, floss, mouthwash" />
          <ListRow href="/challenges" icon={<Route className="size-5 text-accent" aria-hidden />} title="Distance challenges" subtitle="Te Araroa, the walk to Mordor and more" />
          <ListRow href="/achievements" icon={<Award className="size-5 text-accent" aria-hidden />} title="Achievements" subtitle="Medals and badges" />
        </List>
      </Card>
      <Card>
        <List>
          <ListRow href="/reminders" icon={<Bell className="size-5 text-accent" aria-hidden />} title="Reminders" subtitle="Weigh-ins, gym days, brushing, to-dos" />
          <ListRow href="/exercises" icon={<Dumbbell className="size-5 text-accent" aria-hidden />} title="Exercises & progress" />
          <ListRow href="/workouts" icon={<NotebookTabs className="size-5 text-accent" aria-hidden />} title="Routines" />
        </List>
      </Card>
      <Card>
        <List>
          <ListRow href="/settings" icon={<Settings className="size-5 text-accent" aria-hidden />} title="Settings" subtitle="Units, timezone, notifications, export" />
          <ListRow href="/welcome" icon={<Smartphone className="size-5 text-accent" aria-hidden />} title="Install on your iPhone" />
        </List>
      </Card>
      <Card>
        <form action="/auth/signout" method="post">
          <button type="submit" className="flex w-full items-center gap-3 px-4 py-3.5 text-[16px] text-danger active:bg-card-pressed">
            <LogOut className="size-5" aria-hidden /> Sign out
          </button>
        </form>
      </Card>
      <p className="mt-6 text-center text-[12px] text-faint">Life Tracker</p>
    </>
  );
}
