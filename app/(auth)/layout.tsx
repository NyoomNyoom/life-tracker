import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 pt-safe pb-safe">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image src="/icons/icon-192.png" alt="" width={64} height={64} className="rounded-2xl" priority />
        <p className="mt-3 text-[15px] font-semibold text-muted">Life Tracker</p>
      </div>
      {children}
    </main>
  );
}
