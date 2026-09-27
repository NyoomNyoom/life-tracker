"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewerOrNull } from "@/lib/viewer";

export async function deleteRoutine(formData: FormData) {
  const viewer = await getViewerOrNull();
  if (!viewer) redirect("/login");
  const id = z.uuid().safeParse(formData.get("id"));
  // Past workouts keep their sets; they just stop pointing at the routine.
  if (id.success) await viewer.supabase.from("routines").delete().eq("id", id.data);
  revalidatePath("/", "layout");
  redirect("/workouts");
}
