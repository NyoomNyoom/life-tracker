import type { Metadata } from "next";
import Link from "next/link";
import { Award, Bell, LogOut, NotebookTabs, Route, Settings, Smartphone, Smile } from "lucide-react";
import { BarbellIcon } from "@/components/icons";
import { IconSquare, ListRow, PageHeader, Rows, Tile } from "@/components/ui";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "More" };

export default async function MorePage() {
  const { profile } = await getViewer();
  return (
    <>
      <PageHeader title="More" subtitle={profile.email} />

      <div className="mx-3 mb-2.5 grid grid-cols-2 gap-2.5">
        <Link href="/teeth" className="row-span-2 flex min-h-72 flex-col rounded-tile bg-teeth p-6 text-teeth-ink active:opacity-85">
          <Smile className="size-9" aria-hidden />
          <span className="display mt-auto text-[34px]">Teeth</span>
          <span className="mt-2 text-[16px] leading-snug font-medium">Morning and night brushing, floss, mouthwash</span>
        </Link>
        <Link href="/challenges" className="flex min-h-36 flex-col justify-between rounded-tile bg-challenges p-6 text-challenges-ink active:opacity-85">
          <Route className="size-8" aria-hidden />
          <span className="text-[20px] leading-tight font-extrabold text-white">Distance challenges</span>
        </Link>
        <Link href="/achievements" className="flex min-h-36 flex-col justify-between rounded-tile bg-achievements p-6 text-achievements-ink active:opacity-85">
          <Award className="size-8" aria-hidden />
          <span className="text-[20px] leading-tight font-extrabold">Achievements</span>
        </Link>
      </div>

      <Tile className="py-2">
        <Rows>
          <ListRow href="/reminders" icon={<IconSquare tone="reminders"><Bell /></IconSquare>} title="Reminders" subtitle="Weigh-ins, gym days, brushing, to-dos" />
          <ListRow href="/exercises" icon={<IconSquare tone="trainingSoft"><BarbellIcon /></IconSquare>} title="Exercises & progress" />
          <ListRow href="/workouts" icon={<IconSquare tone="trainingSoft"><NotebookTabs /></IconSquare>} title="Routines" />
        </Rows>
      </Tile>

      <Tile className="py-2">
        <Rows>
          <ListRow href="/settings" icon={<IconSquare tone="field"><Settings /></IconSquare>} title="Settings" subtitle="Units, timezone, notifications, export" />
          <ListRow href="/welcome" icon={<IconSquare tone="field"><Smartphone /></IconSquare>} title="Install on your iPhone" />
        </Rows>
      </Tile>

      <form action="/auth/signout" method="post" className="mx-3">
        <button type="submit" className="flex h-16 w-full items-center justify-center gap-2.5 rounded-full bg-danger-soft text-[19px] font-bold text-danger active:opacity-80">
          <LogOut className="size-5 -scale-x-100" aria-hidden /> Sign out
        </button>
      </form>
    </>
  );
}
