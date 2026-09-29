import type { ReactNode } from "react";
import { LogoMark } from "@/components/icons";

/** Logo, app name and a big title, 20px from the edge like all page text. */
export function AuthHeader({ title, subtitle, showName = true }: { title: ReactNode; subtitle?: ReactNode; showName?: boolean }) {
  return (
    <header className="mb-5 px-2">
      <div className="flex items-center gap-3">
        <LogoMark size={showName ? 42 : 60} />
        {showName && <span className="text-[17px] font-bold text-muted">Life Tracker</span>}
      </div>
      <h1 className="display mt-5 text-[46px]">{title}</h1>
      {subtitle && <p className="mt-3 text-[17px] leading-snug font-medium text-muted">{subtitle}</p>}
    </header>
  );
}

/** The white card that holds an auth form. */
export function AuthCard({ children }: { children: ReactNode }) {
  return <div className="space-y-4 rounded-tile bg-card p-5">{children}</div>;
}
