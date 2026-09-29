import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      {/* The app mark with one tile missing. */}
      <div className="grid w-48 grid-cols-2 gap-2.5" aria-hidden>
        <span className="aspect-square rounded-[16px] rounded-tl-[44px] bg-weight" />
        <span className="aspect-square rounded-[16px] rounded-tr-[44px] bg-training" />
        <span className="aspect-square rounded-[16px] rounded-bl-[44px] bg-todos" />
        <span className="aspect-square rounded-[16px] rounded-br-[44px] border-[3px] border-dashed border-faint" />
      </div>
      <h1 className="display mt-6 text-[46px]">Not found</h1>
      <p className="mt-3 text-[17px] leading-snug font-medium text-muted">That page doesn&apos;t exist, or it belongs to someone else.</p>
      <div className="mt-7">
        <LinkButton href="/" size="xl">
          Go to Today
        </LinkButton>
      </div>
    </main>
  );
}
