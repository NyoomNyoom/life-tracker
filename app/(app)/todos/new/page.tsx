import type { Metadata } from "next";
import { TodoForm } from "@/components/todo-form";
import { PageHeader } from "@/components/ui";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "New to-do" };

export default async function NewTodoPage() {
  const { today } = await getViewer();
  return (
    <>
      <PageHeader back={{ href: "/todos", label: "To-dos" }} title="New to-do" />
      <TodoForm today={today} />
    </>
  );
}
