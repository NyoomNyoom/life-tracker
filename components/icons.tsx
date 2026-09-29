import type { SVGProps } from "react";

// Two glyphs lucide doesn't draw the way the design wants: a straight-on barbell and a bathroom scale.
// Same API shape as lucide icons (24px grid, currentColor stroke).

type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number };

function Svg({ strokeWidth = 2, children, ...rest }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function BarbellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 7v10M17.5 7v10M3 10v4M21 10v4M6.5 12h11" />
    </Svg>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M8.5 8.5h7a3.5 3.5 0 0 1-7 0Z" />
    </Svg>
  );
}

/** The app mark: an ink tile holding four tracker colours. */
export function LogoMark({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="17" fill="var(--ink)" />
      <rect x="9" y="9" width="21.5" height="21.5" rx="6" fill="var(--weight)" />
      <rect x="33.5" y="9" width="21.5" height="21.5" rx="6" fill="var(--training)" />
      <rect x="9" y="33.5" width="21.5" height="21.5" rx="6" fill="var(--todos)" />
      <rect x="33.5" y="33.5" width="21.5" height="21.5" rx="6" fill="var(--done)" />
    </svg>
  );
}
