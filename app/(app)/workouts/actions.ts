"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewerOrNull } from "@/lib/viewer";

export async function deleteWorkout(formData: FormData) {
  const viewer = await getViewerOrNull();
  if (!viewer) redirect("/login");
  const id = z.uuid().safeParse(formData.get("id"));
  if (id.success) await viewer.supabase.from("workouts").delete().eq("id", id.data);
  revalidatePath("/", "layout");
  redirect("/workouts");
}
