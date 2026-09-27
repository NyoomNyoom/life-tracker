import { redirect } from "next/navigation";

// Routines are listed on the Train tab.
export default function RoutinesIndex() {
  redirect("/workouts");
}
