"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewerOrNull } from "@/lib/viewer";

export async function deleteExercise(formData: FormData) {
  const viewer = await getViewerOrNull();
  if (!viewer) redirect("/login");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/exercises");
  // RLS only lets you delete your own custom exercises; the foreign key refuses if it's in any workout.
  const { error } = await viewer.supabase.from("exercises").delete().eq("id", id.data).eq("user_id", viewer.userId);
  if (error) redirect(`/exercises/${id.data}?error=in-use`);
  revalidatePath("/", "layout");
  redirect("/exercises");
}
