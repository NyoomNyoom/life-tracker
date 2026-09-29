import { TabBar } from "@/components/tab-bar";
import { getViewer } from "@/lib/viewer";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Belt and braces: the proxy already redirects signed-out visitors.
  await getViewer();
  return (
    <>
      <main className="mx-auto w-full max-w-xl pt-safe pb-tabbar">{children}</main>
      <TabBar />
    </>
  );
}
