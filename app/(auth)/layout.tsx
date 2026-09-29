export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-3 pt-[calc(env(safe-area-inset-top)+28px)] pb-[calc(env(safe-area-inset-bottom)+28px)]">{children}</main>;
}
