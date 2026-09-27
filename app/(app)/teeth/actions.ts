"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { evaluateAchievements } from "@/lib/achievements-server";
import { addDays } from "@/lib/dates";
import { getViewerOrNull } from "@/lib/viewer";

const input = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(["morning", "night"]),
  brushed: z.boolean(),
  flossed: z.boolean(),
  mouthwash: z.boolean(),
});

/**
 * Sets one brushing check-in. Ticking floss or mouthwash counts as brushed; un-brushing clears
 * the extras too. Returns any achievements this earned (e.g. a streak badge).
 */
export async function setBrushing(raw: z.input<typeof input>): Promise<{ earned: string[] }> {
  const viewer = await getViewerOrNull();
  const parsed = input.safeParse(raw);
  if (!viewer || !parsed.success) return { earned: [] };
  const { date, slot, flossed, mouthwash } = parsed.data;
  const brushed = parsed.data.brushed || flossed || mouthwash;

  // Back-filling is allowed for the last few weeks, never the future.
  if (date > viewer.today || date < addDays(viewer.today, -30)) return { earned: [] };

  if (brushed) {
    await viewer.supabase
      .from("brushing_logs")
      .upsert({ user_id: viewer.userId, log_date: date, slot, flossed, mouthwash }, { onConflict: "user_id,log_date,slot" });
  } else {
    await viewer.supabase.from("brushing_logs").delete().eq("log_date", date).eq("slot", slot);
  }

  const earned = brushed ? await evaluateAchievements(viewer) : [];
  revalidatePath("/", "layout");
  return { earned };
}
