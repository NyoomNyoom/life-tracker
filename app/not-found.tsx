import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-[24px] font-bold">Not found</h1>
      <p className="text-muted">That page doesn&apos;t exist, or it belongs to someone else.</p>
      <LinkButton href="/">Go to Today</LinkButton>
    </main>
  );
}
