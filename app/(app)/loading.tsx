// Shown the instant a tab or link is tapped, while the page renders on the server. It also lets Next
// prefetch each route's shell, so navigation never waits on the server before something changes.
export default function Loading() {
  return (
    <div data-skeleton aria-busy="true" aria-label="Loading" className="animate-pulse motion-reduce:animate-none">
      <div className="px-5 pt-4 pb-4">
        <div className="h-10 w-44 rounded-2xl bg-field" />
        <div className="mt-3 h-4 w-56 rounded-full bg-field" />
      </div>
      <div className="mx-3 mb-2.5 h-44 rounded-tile bg-card" />
      <div className="mx-3 mb-2.5 h-64 rounded-tile bg-card" />
      <div className="mx-3 mb-2.5 h-36 rounded-tile bg-card" />
    </div>
  );
}
