import { TabBar } from "@/components/tab-bar";
import { requireMe } from "@/lib/data";

export default async function PlayerLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  return (
    <div className="mx-auto max-w-md min-h-svh pb-28">
      {children}
      <TabBar role={me.profile.role} />
    </div>
  );
}
